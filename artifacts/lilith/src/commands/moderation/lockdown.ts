import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  OverwriteType,
  EmbedBuilder,
  TextChannel,
  VoiceChannel,
} from "discord.js";
import {
  saveLockdownOverwrites,
  getLockdownOverwrites,
  clearLockdownOverwrites,
  setLockdownState,
  getLockdownState,
} from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("lockdown")
  .setDescription("Emergency server lockdown — lock or unlock all channels")
  .addSubcommand((s) =>
    s.setName("start")
      .setDescription("Lock every channel immediately")
      .addStringOption((o) =>
        o.setName("reason").setDescription("Reason for lockdown").setRequired(false)
      )
  )
  .addSubcommand((s) =>
    s.setName("end")
      .setDescription("Restore all channels to normal")
  )
  .addSubcommand((s) =>
    s.setName("status")
      .setDescription("Check if a lockdown is active")
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply({ flags: 64 });

  const sub = (interaction.options as any).getSubcommand();
  const opts = interaction.options as any;

  if (sub === "status") {
    const state = await getLockdownState(interaction.guild.id);
    if (!state?.active) {
      return interaction.editReply("✅ No active lockdown.");
    }
    return interaction.editReply(
      `🔒 **Lockdown active** since <t:${Math.floor(new Date(state.started_at).getTime() / 1000)}:R>.\nReason: ${state.reason ?? "No reason given"}`
    );
  }

  if (sub === "start") {
    const existing = await getLockdownState(interaction.guild.id);
    if (existing?.active) {
      return interaction.editReply("A lockdown is already active. Use `/lockdown end` to lift it first.");
    }

    const reason = opts.getString("reason") ?? "Emergency lockdown";
    const everyone = interaction.guild.roles.everyone;
    const channels = await interaction.guild.channels.fetch();

    let locked = 0;
    const overwrites: { channelId: string; allow: string; deny: string }[] = [];

    for (const [, channel] of channels) {
      if (!channel) continue;
      if (
        channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildVoice &&
        channel.type !== ChannelType.GuildAnnouncement &&
        channel.type !== ChannelType.GuildForum &&
        channel.type !== ChannelType.GuildStageVoice
      ) continue;

      // Save existing @everyone overwrite
      const existing = (channel as any).permissionOverwrites?.cache.get(everyone.id);
      overwrites.push({
        channelId: channel.id,
        allow: (existing?.allow?.bitfield ?? 0n).toString(),
        deny: (existing?.deny?.bitfield ?? 0n).toString(),
      });

      try {
        if (
          channel.type === ChannelType.GuildVoice ||
          channel.type === ChannelType.GuildStageVoice
        ) {
          await (channel as VoiceChannel).permissionOverwrites.edit(everyone, {
            Speak: false,
            SendMessages: false,
          });
        } else {
          await (channel as TextChannel).permissionOverwrites.edit(everyone, {
            SendMessages: false,
            AddReactions: false,
            SendMessagesInThreads: false,
          });
        }
        locked++;
      } catch {}
    }

    await saveLockdownOverwrites(interaction.guild.id, overwrites);
    await setLockdownState(interaction.guild.id, true, reason);

    const embed = new EmbedBuilder()
      .setTitle("🔒 Server Locked Down")
      .setDescription(`**Reason:** ${reason}\n**Channels locked:** ${locked}`)
      .setColor(0xe74c3c)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "end") {
    const state = await getLockdownState(interaction.guild.id);
    if (!state?.active) {
      return interaction.editReply("There's no active lockdown to end.");
    }

    const overwrites = await getLockdownOverwrites(interaction.guild.id);
    const everyone = interaction.guild.roles.everyone;
    let restored = 0;

    for (const row of overwrites) {
      const channel = interaction.guild.channels.cache.get(row.channel_id) as any;
      if (!channel) continue;
      try {
        const allow = BigInt(row.allow);
        const deny = BigInt(row.deny);
        if (allow === 0n && deny === 0n) {
          // No original overwrite — remove the one we added
          await channel.permissionOverwrites.delete(everyone);
        } else {
          await channel.permissionOverwrites.edit(everyone, {
            allow,
            deny,
          });
        }
        restored++;
      } catch {}
    }

    await clearLockdownOverwrites(interaction.guild.id);
    await setLockdownState(interaction.guild.id, false, null);

    const embed = new EmbedBuilder()
      .setTitle("🔓 Lockdown Lifted")
      .setDescription(`**Channels restored:** ${restored}`)
      .setColor(0x2ecc71)
      .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
  }
}
