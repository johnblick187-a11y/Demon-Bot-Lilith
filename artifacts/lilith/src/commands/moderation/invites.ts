import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { getInviteStats, getInviteLeaderboard } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("invites")
  .setDescription("Check invite stats")
  .addSubcommand((s) =>
    s.setName("check")
      .setDescription("See how many people a user has invited")
      .addUserOption((o) => o.setName("user").setDescription("User to check (defaults to you)").setRequired(false))
  )
  .addSubcommand((s) =>
    s.setName("leaderboard")
      .setDescription("Top inviters in this server")
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  const sub = (interaction.options as any).getSubcommand();
  const opts = interaction.options as any;

  if (sub === "check") {
    await interaction.deferReply();
    const target = opts.getUser("user") ?? interaction.user;
    const stats = await getInviteStats(interaction.guild.id, target.id);

    const total = stats?.total ?? 0;
    const left = stats?.left ?? 0;
    const real = total - left;

    const embed = new EmbedBuilder()
      .setAuthor({ name: target.username, iconURL: target.displayAvatarURL() })
      .setColor(0x3498db)
      .addFields(
        { name: "Total Invites", value: String(total), inline: true },
        { name: "Still In Server", value: String(real), inline: true },
        { name: "Left", value: String(left), inline: true }
      )
      .setDescription(`<@${target.id}> has invited **${total}** member(s) — **${real}** still here, **${left}** left.`);

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "leaderboard") {
    await interaction.deferReply();
    const rows = await getInviteLeaderboard(interaction.guild.id, 10);

    if (rows.length === 0) {
      return interaction.editReply("No invite data yet. Invites are tracked from when Lilith is online.");
    }

    const medals = ["🥇", "🥈", "🥉"];
    const lines = rows.map((r: any, i: number) => {
      const prefix = medals[i] ?? `**#${i + 1}**`;
      const real = r.total - r.left;
      return `${prefix} <@${r.inviter_id}> — **${r.total}** invites (${real} stayed, ${r.left} left)`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`📨 Invite Leaderboard — ${interaction.guild.name}`)
      .setDescription(lines.join("\n"))
      .setColor(0x9b59b6)
      .setFooter({ text: "Only tracks invites made while Lilith is online" });

    return interaction.editReply({ embeds: [embed] });
  }
}
