import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { getForcedPersonality, computeMode, getOwnerBypassSuspended } from "../../lib/ai.js";
import { getRelation } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("mode")
  .setDescription("Check Lilith's current temperament mode");

export async function execute(interaction: CommandInteraction) {
  const isOwner = interaction.user.id === OWNER_ID;
  const forced = getForcedPersonality();
  const bypassSuspended = getOwnerBypassSuspended();

  const rel = await getRelation(interaction.user.id, interaction.user.username);
  const personalMode = computeMode(rel.affinity, rel.annoyance, rel.enemy ?? false);

  const forcedDisplay =
    forced === "chaos" ? "🔥 **CHAOS** — Forced globally"
    : forced === "angry" ? "😤 **ANGRY** — Forced globally"
    : forced === "default" ? "😑 **DEFAULT** — Forced globally"
    : "✅ Natural — driven by affinity/annoyance";

  const personalDisplay =
    personalMode === "chaos" ? "🔥 **CHAOS**"
    : personalMode === "angry" ? "😤 **ANGRY**"
    : "😑 **DEFAULT**";

  const color =
    forced === "chaos" || personalMode === "chaos" ? 0x8b0000
    : forced === "angry" || personalMode === "angry" ? 0xff4500
    : 0x6a0dad;

  const embed = new EmbedBuilder()
    .setTitle("🧠 Lilith — Current Mode")
    .setColor(color)
    .addFields(
      { name: "Global Override", value: forcedDisplay, inline: false },
      { name: `Your Mode (${interaction.user.username})`, value: `${personalDisplay} — aff \`${rel.affinity > 0 ? "+" : ""}${rel.affinity}\` | ann \`${rel.annoyance}/100\``, inline: false }
    );

  if (isOwner) {
    embed.addFields({
      name: "Test Mode",
      value: bypassSuspended ? "🔴 ON — owner bypass suspended" : "🟢 OFF — owner bypass active",
      inline: false
    });
  }

  embed.setFooter({ text: "Global override takes priority. Natural mode = affinity/annoyance driven." });

  await interaction.reply({ embeds: [embed], flags: isOwner ? 64 : undefined });
}
