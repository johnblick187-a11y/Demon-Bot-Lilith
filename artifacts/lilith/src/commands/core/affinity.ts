import {
  SlashCommandBuilder,
  EmbedBuilder,
  CommandInteraction,
  GuildMember,
} from "discord.js";
import { getRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";
import { computeMode } from "../../lib/ai.js";

export const data = new SlashCommandBuilder()
  .setName("affinity")
  .setDescription("Check Lilith's relationship level with a user")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("The user to check (defaults to you)").setRequired(false)
  );

export async function execute(interaction: CommandInteraction) {
  const target =
    (interaction.options as any).getUser("user") ?? interaction.user;

  if (target.id === OWNER_ID) {
    const embed = new EmbedBuilder()
      .setTitle("💜 Affinity — tweakbrazy")
      .setColor(0x9932cc)
      .setDescription(
        "tweakbrazy is my owner. My loyalty to them is absolute. They exist beyond your little affinity scale."
      )
      .setFooter({ text: "Not up for discussion." });
    return interaction.reply({ embeds: [embed] });
  }

  const rel = await getRelation(target.id, target.username);

  const bar = buildAffinityBar(rel.affinity);

  let label = "";
  if (rel.affinity >= 80) label = "Strangely fond of them";
  else if (rel.affinity >= 40) label = "Tolerates them";
  else if (rel.affinity >= -39) label = "Indifferent";
  else if (rel.affinity >= -80) label = "Contemptuous";
  else label = "Despises them";

  const mode = computeMode(rel.affinity, rel.annoyance, rel.enemy ?? false);
  const modeDisplay = mode === "chaos"
    ? "🔥 CHAOS"
    : mode === "angry"
    ? "😤 ANGRY"
    : "😑 DEFAULT";

  const embed = new EmbedBuilder()
    .setTitle(`💀 Affinity — ${target.username}`)
    .setColor(mode === "chaos" ? 0x8b0000 : mode === "angry" ? 0xff4500 : 0x4a4a4a)
    .setDescription(
      `${bar}\n\n**${rel.affinity > 0 ? "+" : ""}${rel.affinity}/100** — ${label}`
    )
    .addFields(
      { name: "Annoyance", value: `${rel.annoyance}/100${rel.annoyance_locked ? " 🔒" : ""}`, inline: true },
      { name: "Mode", value: modeDisplay, inline: true },
      { name: "Status", value: rel.blacklisted ? "Blacklisted 🚫" : (rel as any).enemy ? "Enemy 🩸" : "Clear", inline: true }
    )
    .setFooter({ text: "These numbers change. Don't get comfortable." });

  await interaction.reply({ embeds: [embed] });
}

function buildAffinityBar(value: number): string {
  const normalized = Math.round((value + 100) / 20);
  const filled = Math.max(0, Math.min(10, normalized));
  return "💜".repeat(filled) + "🖤".repeat(10 - filled);
}
