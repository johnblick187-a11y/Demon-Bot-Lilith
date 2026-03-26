import { SlashCommandBuilder, CommandInteraction, EmbedBuilder, GuildMember } from "discord.js";
import { getUserLevel, getLeaderboard } from "../../lib/db.js";
import { computeLevel } from "../../lib/xp.js";

export const data = new SlashCommandBuilder()
  .setName("rank")
  .setDescription("Check your XP rank (or someone else's)")
  .addUserOption((o) => o.setName("user").setDescription("User to check").setRequired(false));

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply();

  const opts = interaction.options as any;
  const target = opts.getUser("user") ?? interaction.user;
  const member = await interaction.guild.members.fetch(target.id).catch(() => null) as GuildMember | null;

  const row = await getUserLevel(interaction.guild.id, target.id);
  const totalXp = row?.xp ?? 0;
  const totalMessages = row?.total_messages ?? 0;
  const { level, currentXp, neededXp } = computeLevel(totalXp);

  // Get server rank
  const lb = await getLeaderboard(interaction.guild.id, 1000);
  const rank = lb.findIndex((r: any) => r.user_id === target.id) + 1;

  const bar = buildProgressBar(currentXp, neededXp, 12);
  const displayName = member?.displayName ?? target.username;
  const color = member?.displayColor || 0x9b59b6;

  const embed = new EmbedBuilder()
    .setAuthor({ name: displayName, iconURL: target.displayAvatarURL() })
    .setColor(color)
    .setDescription(`**Level ${level}** — ${totalXp.toLocaleString()} total XP`)
    .addFields(
      { name: "Progress", value: `${bar}\n${currentXp} / ${neededXp} XP`, inline: false },
      { name: "Server Rank", value: rank > 0 ? `#${rank}` : "Unranked", inline: true },
      { name: "Messages", value: totalMessages.toLocaleString(), inline: true }
    );

  return interaction.editReply({ embeds: [embed] });
}

function buildProgressBar(current: number, needed: number, length: number): string {
  const filled = Math.round((current / needed) * length);
  const empty = length - filled;
  return `\`[${"█".repeat(filled)}${"░".repeat(empty)}]\``;
}
