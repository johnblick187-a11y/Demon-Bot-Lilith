import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";
import { getRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("annoyance")
  .setDescription("How irritated is Lilith with you right now?");

export async function execute(interaction: CommandInteraction) {
  const userId = interaction.user.id;

  if (userId === OWNER_ID) {
    const embed = new EmbedBuilder()
      .setTitle("😈 My Annoyance Level — tweakbrazy")
      .setColor(0x9932cc)
      .setDescription("You? Annoy me? Never. You're the only one I actually tolerate.\n\n**Annoyance: 0/100**")
      .setFooter({ text: "Don't push it though." });
    return interaction.reply({ embeds: [embed] });
  }

  const rel = await getRelation(userId, interaction.user.username);
  const bar = buildBar(rel.annoyance);

  let description = "";
  if (rel.blacklisted) {
    description = "You're blacklisted. You don't get a number. You get nothing.";
  } else if (rel.annoyance >= 90) {
    description = `${bar}\n\n**${rel.annoyance}/100** — You exist and that's enough to irritate me.`;
  } else if (rel.annoyance >= 60) {
    description = `${bar}\n\n**${rel.annoyance}/100** — Getting on my nerves.`;
  } else if (rel.annoyance >= 30) {
    description = `${bar}\n\n**${rel.annoyance}/100** — Mildly irritating.`;
  } else {
    description = `${bar}\n\n**${rel.annoyance}/100** — You haven't annoyed me yet. Impressive.`;
  }

  const embed = new EmbedBuilder()
    .setTitle(`😠 Annoyance — ${interaction.user.username}`)
    .setColor(0x8b0000)
    .setDescription(description)
    .setFooter({ text: "One wrong move." });

  await interaction.reply({ embeds: [embed] });
}

function buildBar(value: number): string {
  const filled = Math.floor(value / 10);
  return "🟥".repeat(filled) + "⬛".repeat(10 - filled);
}
