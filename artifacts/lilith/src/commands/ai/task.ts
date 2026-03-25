import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { askLilith } from "../../lib/ai.js";
import { getRelation, updateRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("task")
  .setDescription("Give Lilith a focused task to execute")
  .addStringOption((opt) =>
    opt.setName("prompt").setDescription("What task do you need done?").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();

  const prompt = (interaction.options as any).getString("prompt", true);
  const userId = interaction.user.id;
  const isOwner = userId === OWNER_ID;

  const rel = isOwner
    ? { affinity: 100, annoyance: 0 }
    : await getRelation(userId, interaction.user.username);

  const response = await askLilith(prompt, {
    userId,
    username: interaction.user.username,
    affinity: rel.affinity,
    annoyance: rel.annoyance,
    isOwner,
    mode: "task",
  });

  if (!isOwner) {
    await updateRelation(userId, { affinity: 2 });
  }

  await interaction.editReply(`**Task Mode**\n${response}`);
}
