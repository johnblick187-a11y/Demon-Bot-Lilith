import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";
import { askLilith } from "../../lib/ai.js";
import { getRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("google")
  .setDescription("Have Lilith look something up")
  .addStringOption((opt) =>
    opt.setName("query").setDescription("What to search for").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();
  const query = (interaction.options as any).getString("query", true);
  const userId = interaction.user.id;
  const isOwner = userId === OWNER_ID;

  const rel = isOwner
    ? { affinity: 100, annoyance: 0, enemy: false }
    : await getRelation(userId, interaction.user.username);

  const response = await askLilith(
    `Search query: "${query}". Answer from your knowledge — be informative but stay in character. Note if you're uncertain about current or recent information.`,
    {
      userId,
      username: interaction.user.username,
      affinity: rel.affinity,
      annoyance: rel.annoyance,
      isOwner,
      mode: "task",
      enemy: (rel as any).enemy ?? false,
    }
  );

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${query}`)
    .setColor(0x8b0000)
    .setDescription(response)
    .setFooter({ text: "Lilith Search — results may not reflect recent events." });

  await interaction.editReply({ embeds: [embed] });
}
