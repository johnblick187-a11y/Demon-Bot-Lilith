import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { askLilith } from "../../lib/ai.js";
import { getRelation, updateRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("ask")
  .setDescription("Ask Lilith something")
  .addStringOption((opt) =>
    opt.setName("query").setDescription("What do you want to ask?").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();

  const query = (interaction.options as any).getString("query", true);
  const userId = interaction.user.id;
  const isOwner = userId === OWNER_ID;

  const rel = isOwner
    ? { affinity: 100, annoyance: 0 }
    : await getRelation(userId, interaction.user.username);

  const response = await askLilith(query, {
    userId,
    username: interaction.user.username,
    affinity: rel.affinity,
    annoyance: rel.annoyance,
    isOwner,
    mode: "chat",
    enemy: (rel as any).enemy ?? false,
  } as any);

  if (!isOwner) {
    await updateRelation(userId, { affinity: 1 });
  }

  await interaction.editReply(response);
}
