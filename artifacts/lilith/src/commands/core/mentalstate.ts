import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { getAllUserRelations, getLilithMoodData } from "../../lib/db.js";
import { getForcedPersonality, computeMode, LilithMode } from "../../lib/ai.js";

export const data = new SlashCommandBuilder()
  .setName("mentalstate")
  .setDescription("Full breakdown of Lilith's current psychological state (owner only)")
  .setDefaultMemberPermissions(0n);

function rageScore(affinity: number, annoyance: number): number {
  return Math.round(annoyance * 0.7 + Math.max(0, -affinity) * 0.3);
}

function modeIcon(mode: LilithMode): string {
  if (mode === "chaos") return "🔥";
  if (mode === "angry") return "😤";
  return "😑";
}

function modeLabel(mode: LilithMode): string {
  if (mode === "chaos") return "CHAOS";
  if (mode === "angry") return "ANGRY";
  return "DEFAULT";
}

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "You don't have that authority.", flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });

  const [users, moodData] = await Promise.all([getAllUserRelations(), getLilithMoodData()]);

  const forced = getForcedPersonality();
  const forcedDisplay = forced === "chaos"
    ? "🔥 CHAOS — Forced"
    : forced === "angry"
    ? "😤 ANGRY — Forced"
    : "✅ Natural (affinity/annoyance driven)";

  const hour = new Date().getHours();
  const timeFactor = Math.round(Math.sin((hour / 24) * Math.PI * 2) * 8);
  const rawMood = 100 - moodData.avgAnnoyance - moodData.enemyCount * 8 + timeFactor;
  const moodIndex = Math.max(0, Math.min(100, rawMood));
  const moodBar = "🟪".repeat(Math.round(moodIndex / 10)) + "⬛".repeat(10 - Math.round(moodIndex / 10));

  const chaosCount = users.filter(u => computeMode(u.affinity, u.annoyance, u.enemy) === "chaos").length;
  const angryCount = users.filter(u => computeMode(u.affinity, u.annoyance, u.enemy) === "angry").length;
  const defaultCount = users.filter(u => computeMode(u.affinity, u.annoyance, u.enemy) === "default").length;

  const topUsers = users.slice(0, 8);
  const userLines = topUsers.map(u => {
    const rage = rageScore(u.affinity, u.annoyance);
    const mode = computeMode(u.affinity, u.annoyance, u.enemy);
    const tag = u.enemy ? " 🩸" : u.blacklisted ? " 🚫" : "";
    return `${modeIcon(mode)} **${u.username}**${tag} — rage \`${rage}\` | aff \`${u.affinity > 0 ? "+" : ""}${u.affinity}\` ann \`${u.annoyance}\``;
  });

  const embed = new EmbedBuilder()
    .setTitle("🧠 Lilith — Mental State Dashboard")
    .setColor(
      forced === "chaos" ? 0x8b0000
      : forced === "angry" ? 0xff4500
      : moodIndex < 30 ? 0x8b0000
      : moodIndex < 60 ? 0xff4500
      : 0x6a0dad
    )
    .addFields(
      {
        name: "Personality Override",
        value: forcedDisplay,
        inline: false,
      },
      {
        name: "Server Mood Index",
        value: `${moodBar} **${moodIndex}/100**\nAvg annoyance: ${moodData.avgAnnoyance} | Enemies: ${moodData.enemyCount} | Users tracked: ${moodData.userCount}`,
        inline: false,
      },
      {
        name: "Mode Distribution",
        value: `🔥 Chaos: **${chaosCount}** | 😤 Angry: **${angryCount}** | 😑 Default: **${defaultCount}**`,
        inline: false,
      },
      {
        name: "Highest Rage Scores",
        value: userLines.length > 0 ? userLines.join("\n") : "No users tracked yet.",
        inline: false,
      }
    )
    .setFooter({ text: "Rage = annoyance×0.7 + (−affinity)×0.3 | 40+ Angry | 70+ Chaos" })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
