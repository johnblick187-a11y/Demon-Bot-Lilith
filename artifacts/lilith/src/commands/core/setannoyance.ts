import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { setRelationDirect, getRelation } from "../../lib/db.js";
import { computeMode } from "../../lib/ai.js";

export const data = new SlashCommandBuilder()
  .setName("setannoyance")
  .setDescription("Directly set a user's annoyance level (owner only)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Target user").setRequired(true)
  )
  .addIntegerOption((opt) =>
    opt.setName("value").setDescription("Annoyance value (0–100)").setRequired(true).setMinValue(0).setMaxValue(100)
  )
  .setDefaultMemberPermissions(0n);

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "You don't have that authority.", flags: 64 });
  }

  const target = (interaction.options as any).getUser("user", true);
  const value = (interaction.options as any).getInteger("value", true) as number;

  await setRelationDirect(target.id, target.username, { annoyance: value });
  const rel = await getRelation(target.id, target.username);
  const mode = computeMode(rel.affinity, rel.annoyance, rel.enemy ?? false);
  const modeLabel = mode === "chaos" ? "🔥 CHAOS" : mode === "angry" ? "😤 ANGRY" : "😑 DEFAULT";

  const embed = new EmbedBuilder()
    .setTitle("⚙️ Annoyance Set")
    .setColor(mode === "chaos" ? 0x8b0000 : mode === "angry" ? 0xff4500 : 0x4a4a4a)
    .setDescription(`**${target.username}**'s annoyance set to **${value}/100**`)
    .addFields(
      { name: "Affinity", value: `${rel.affinity > 0 ? "+" : ""}${rel.affinity}`, inline: true },
      { name: "Annoyance", value: `${rel.annoyance}/100`, inline: true },
      { name: "Mode", value: modeLabel, inline: true }
    )
    .setFooter({ text: "Changes take effect immediately." });

  await interaction.reply({ embeds: [embed], flags: 64 });
}
