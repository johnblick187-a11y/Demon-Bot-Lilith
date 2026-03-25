import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";
import { getRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("mood")
  .setDescription("Check Lilith's current mood");

const MOODS = [
  { min: 0, max: 20, mood: "Seething", emoji: "🔥", color: 0xff0000 },
  { min: 21, max: 40, mood: "Irritated", emoji: "😤", color: 0xff4500 },
  { min: 41, max: 60, mood: "Indifferent", emoji: "😑", color: 0x8b0000 },
  { min: 61, max: 80, mood: "Amused", emoji: "😏", color: 0x9932cc },
  { min: 81, max: 100, mood: "Dangerous (good mood)", emoji: "😈", color: 0x6a0dad },
];

function getMoodScore(): number {
  const hour = new Date().getHours();
  const base = 40 + Math.sin(hour / 24 * Math.PI * 2) * 20;
  return Math.floor(base + Math.random() * 20);
}

export async function execute(interaction: CommandInteraction) {
  const score = getMoodScore();
  const moodEntry = MOODS.find((m) => score >= m.min && score <= m.max) ?? MOODS[2];

  const embed = new EmbedBuilder()
    .setTitle(`${moodEntry.emoji} Lilith's Current Mood`)
    .setColor(moodEntry.color)
    .setDescription(`**${moodEntry.mood}**\n\nMood Index: ${score}/100`)
    .setFooter({ text: "My mood is none of your business, but there you go." });

  await interaction.reply({ embeds: [embed] });
}
