import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import {
  getAntiNukeSettings,
  setAntiNukeSettings,
  getAntiRaidSettings,
  setAntiRaidSettings,
} from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("antinuke")
  .setDescription("Configure anti-nuke and anti-raid protection")

  .addSubcommand((s) =>
    s.setName("status")
      .setDescription("Show current protection settings")
  )

  .addSubcommand((s) =>
    s.setName("nuke")
      .setDescription("Configure anti-nuke (mass channel/ban/role delete detection)")
      .addBooleanOption((o) => o.setName("enabled").setDescription("Enable or disable").setRequired(true))
      .addIntegerOption((o) => o.setName("channel_threshold").setDescription("Channel deletes before triggering (default 3)").setRequired(false).setMinValue(2).setMaxValue(20))
      .addIntegerOption((o) => o.setName("ban_threshold").setDescription("Bans before triggering (default 5)").setRequired(false).setMinValue(2).setMaxValue(50))
      .addIntegerOption((o) => o.setName("role_threshold").setDescription("Role deletes before triggering (default 3)").setRequired(false).setMinValue(2).setMaxValue(20))
      .addIntegerOption((o) => o.setName("window").setDescription("Time window in seconds (default 10)").setRequired(false).setMinValue(5).setMaxValue(60))
  )

  .addSubcommand((s) =>
    s.setName("raid")
      .setDescription("Configure anti-raid (mass join detection)")
      .addBooleanOption((o) => o.setName("enabled").setDescription("Enable or disable").setRequired(true))
      .addIntegerOption((o) => o.setName("threshold").setDescription("Joins before triggering (default 10)").setRequired(false).setMinValue(3).setMaxValue(100))
      .addIntegerOption((o) => o.setName("window").setDescription("Time window in seconds (default 30)").setRequired(false).setMinValue(5).setMaxValue(120))
  )

  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;

  if (interaction.user.id !== OWNER_ID && !(interaction.memberPermissions?.has(PermissionFlagsBits.Administrator))) {
    return interaction.reply({ content: "Administrator only.", flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });
  const sub = (interaction.options as any).getSubcommand();
  const opts = interaction.options as any;

  if (sub === "status") {
    const nuke = await getAntiNukeSettings(interaction.guild.id);
    const raid = await getAntiRaidSettings(interaction.guild.id);

    const embed = new EmbedBuilder()
      .setTitle("🛡️ Failsafe Protection Status")
      .setColor(0x9b59b6)
      .addFields(
        {
          name: "🔴 Anti-Nuke",
          value: nuke
            ? `${nuke.enabled ? "✅ Enabled" : "❌ Disabled"}\n` +
              `Channels: **${nuke.channel_threshold}** deletes / **${nuke.window_seconds}s**\n` +
              `Bans: **${nuke.ban_threshold}** bans / **${nuke.window_seconds}s**\n` +
              `Roles: **${nuke.role_threshold}** deletes / **${nuke.window_seconds}s**`
            : "Not configured (using defaults — enabled)",
          inline: false,
        },
        {
          name: "🌊 Anti-Raid",
          value: raid
            ? `${raid.enabled ? "✅ Enabled" : "❌ Disabled"}\n` +
              `Trigger: **${raid.join_threshold}** joins / **${raid.window_seconds}s**`
            : "Not configured (using defaults — enabled)",
          inline: false,
        }
      );

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "nuke") {
    const current = await getAntiNukeSettings(interaction.guild.id);
    const enabled = opts.getBoolean("enabled") as boolean;
    const channelThreshold = opts.getInteger("channel_threshold") ?? current?.channel_threshold ?? 3;
    const banThreshold = opts.getInteger("ban_threshold") ?? current?.ban_threshold ?? 5;
    const roleThreshold = opts.getInteger("role_threshold") ?? current?.role_threshold ?? 3;
    const window = opts.getInteger("window") ?? current?.window_seconds ?? 10;

    await setAntiNukeSettings(interaction.guild.id, {
      enabled,
      channel_threshold: channelThreshold,
      ban_threshold: banThreshold,
      role_threshold: roleThreshold,
      window_seconds: window,
    });

    return interaction.editReply(
      `✅ Anti-nuke ${enabled ? "enabled" : "disabled"}.\n` +
      `Triggers if anyone deletes **${channelThreshold}+** channels, **${banThreshold}+** bans, or **${roleThreshold}+** roles within **${window}s**.`
    );
  }

  if (sub === "raid") {
    const current = await getAntiRaidSettings(interaction.guild.id);
    const enabled = opts.getBoolean("enabled") as boolean;
    const threshold = opts.getInteger("threshold") ?? current?.join_threshold ?? 10;
    const window = opts.getInteger("window") ?? current?.window_seconds ?? 30;

    await setAntiRaidSettings(interaction.guild.id, {
      enabled,
      join_threshold: threshold,
      window_seconds: window,
    });

    return interaction.editReply(
      `✅ Anti-raid ${enabled ? "enabled" : "disabled"}.\n` +
      `Triggers if **${threshold}+** members join within **${window}s** — invites will be deleted and verification raised.`
    );
  }
}
