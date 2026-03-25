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
    ? { affinity: 100, annoyance: 0 }
    : await getRelation(userId, interaction.user.username);

  const response = await askLilith(
    `Search query: "${query}". Provide a concise, informative answer as if you looked this up. Include any relevant facts. Stay in character.`,
    {
      userId,
      username: interaction.user.username,
      affinity: rel.affinity,
      annoyance: rel.annoyance,
      isOwner,
      mode: "task",
    }
  );

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${query}`)
    .setColor(0x8b0000)
    .setDescription(response)
    .setFooter({ text: "Lilith Search — You're welcome, I guess." });

  await interaction.editReply({ embeds: [embed] });
}
