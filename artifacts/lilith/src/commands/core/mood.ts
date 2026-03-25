import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";
import { getLilithMoodData } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("mood")
  .setDescription("Check Lilith's current mood");

const MOODS = [
  { min: 0,  max: 15, mood: "Murderous",             emoji: "🩸", color: 0x8b0000 },
  { min: 16, max: 30, mood: "Seething",               emoji: "🔥", color: 0xff0000 },
  { min: 31, max: 45, mood: "Irritated",              emoji: "😤", color: 0xff4500 },
  { min: 46, max: 60, mood: "Indifferent",            emoji: "😑", color: 0x4a4a4a },
  { min: 61, max: 75, mood: "Amused",                 emoji: "😏", color: 0x9932cc },
  { min: 76, max: 90, mood: "Dangerously Good",       emoji: "😈", color: 0x6a0dad },
  { min: 91, max: 100, mood: "Suspiciously Pleasant", emoji: "🖤", color: 0x2a0050 },
];

export async function execute(interaction: CommandInteraction) {
  const { avgAnnoyance, enemyCount, userCount } = await getLilithMoodData();

  const hour = new Date().getHours();
  const timeFactor = Math.round(Math.sin((hour / 24) * Math.PI * 2) * 8);

  const rawScore = 100 - avgAnnoyance - enemyCount * 8 + timeFactor;
  const score = Math.max(0, Math.min(100, rawScore));

  const moodEntry = MOODS.find((m) => score >= m.min && score <= m.max) ?? MOODS[3];

  const bar = buildBar(score);

  const embed = new EmbedBuilder()
    .setTitle(`${moodEntry.emoji} Lilith's Current Mood`)
    .setColor(moodEntry.color)
    .setDescription(
      `**${moodEntry.mood}**\n\n${bar}\n\nMood Index: **${score}/100**`
    )
    .addFields(
      { name: "Avg. Annoyance (all users)", value: `${avgAnnoyance}/100`, inline: true },
      { name: "Active Enemies", value: `${enemyCount}`, inline: true },
      { name: "Users Tracked", value: `${userCount}`, inline: true }
    )
    .setFooter({ text: "My mood is a reflection of how insufferable you all are." });

  await interaction.reply({ embeds: [embed] });
}

function buildBar(value: number): string {
  const filled = Math.round(value / 10);
  return "🟪".repeat(filled) + "⬛".repeat(10 - filled);
}
