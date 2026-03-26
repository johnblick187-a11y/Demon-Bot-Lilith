import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { getLeaderboard } from "../../lib/db.js";
import { computeLevel } from "../../lib/xp.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("XP leaderboard for this server")
  .addIntegerOption((o) =>
    o.setName("page").setDescription("Page number").setRequired(false).setMinValue(1)
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply();

  const opts = interaction.options as any;
  const page = (opts.getInteger("page") ?? 1) - 1;
  const pageSize = 10;

  const all = await getLeaderboard(interaction.guild.id, 200);
  const totalPages = Math.max(1, Math.ceil(all.length / pageSize));
  const slice = all.slice(page * pageSize, page * pageSize + pageSize);

  if (slice.length === 0) {
    return interaction.editReply("No one has earned XP yet.");
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines = await Promise.all(
    slice.map(async (row: any, i: number) => {
      const globalRank = page * pageSize + i + 1;
      const prefix = medals[globalRank - 1] ?? `**#${globalRank}**`;
      let name = `<@${row.user_id}>`;
      try {
        const member = await interaction.guild!.members.fetch(row.user_id).catch(() => null);
        if (member) name = member.displayName;
      } catch {}
      const { level } = computeLevel(row.xp);
      return `${prefix} ${name} — Level ${level} (${row.xp.toLocaleString()} XP)`;
    })
  );

  const embed = new EmbedBuilder()
    .setTitle(`🏆 XP Leaderboard — ${interaction.guild.name}`)
    .setDescription(lines.join("\n"))
    .setColor(0xf1c40f)
    .setFooter({ text: `Page ${page + 1} of ${totalPages} • ${all.length} members ranked` });

  return interaction.editReply({ embeds: [embed] });
}
