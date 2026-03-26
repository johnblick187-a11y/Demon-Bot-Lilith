import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { setRelationDirect, getRelation } from "../../lib/db.js";
import { computeMode } from "../../lib/ai.js";

export const data = new SlashCommandBuilder()
  .setName("setaffinity")
  .setDescription("Directly set a user's affinity level (owner only)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Target user").setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName("value").setDescription("Affinity value (-100 to 100)").setRequired(true).setMinValue(-100).setMaxValue(100)
  )
  .setDefaultMemberPermissions(0n);

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "You don't have that authority.", flags: 64 });
  }

  const target = (interaction.options as any).getUser("user", true);
  const value = (interaction.options as any).getInteger("value", true) as number;

  await setRelationDirect(target.id, target.username, { affinity: value });
  const rel = await getRelation(target.id, target.username);
  const mode = computeMode(rel.affinity, rel.annoyance, rel.enemy ?? false);
  const modeLabel = mode === "chaos" ? "🔥 CHAOS" : mode === "angry" ? "😤 ANGRY" : "😑 DEFAULT";

  const bar = buildAffinityBar(rel.affinity);

  const embed = new EmbedBuilder()
    .setTitle("⚙️ Affinity Set")
    .setColor(mode === "chaos" ? 0x8b0000 : mode === "angry" ? 0xff4500 : 0x6a0dad)
    .setDescription(`**${target.username}**'s affinity set to **${value > 0 ? "+" : ""}${value}/100**\n\n${bar}`)
    .addFields(
      { name: "Affinity", value: `${rel.affinity > 0 ? "+" : ""}${rel.affinity}`, inline: true },
      { name: "Annoyance", value: `${rel.annoyance}/100`, inline: true },
      { name: "Mode", value: modeLabel, inline: true }
    )
    .setFooter({ text: "Changes take effect immediately." });

  await interaction.reply({ embeds: [embed], flags: 64 });
}

function buildAffinityBar(value: number): string {
  const normalized = Math.round((value + 100) / 20);
  const filled = Math.max(0, Math.min(10, normalized));
  return "💜".repeat(filled) + "🖤".repeat(10 - filled);
}
