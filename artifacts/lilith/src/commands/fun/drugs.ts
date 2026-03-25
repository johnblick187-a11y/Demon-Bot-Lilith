import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { DRUG_RESPONSES } from "../../lib/constants.js";
import { updateRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

function makeCommand(name: string, description: string) {
  return new SlashCommandBuilder().setName(name).setDescription(description);
}

export const hitsmethData = makeCommand("hitsmeth", "Lilith hits some meth");
export const hitsweedData = makeCommand("hitsweed", "Lilith hits some weed");
export const chugsdrinkData = makeCommand("chugsdrink", "Lilith chugs a drink");
export const popspillData = makeCommand("popspill", "Lilith pops a pill");

async function drugExecute(
  interaction: CommandInteraction,
  key: keyof typeof DRUG_RESPONSES
) {
  const responses = DRUG_RESPONSES[key];
  const response = responses[Math.floor(Math.random() * responses.length)];
  const userId = interaction.user.id;

  if (userId !== OWNER_ID) {
    await updateRelation(userId, { affinity: 2 });
  }

  await interaction.reply(`**Lilith:** ${response}`);
}

export const executeHitsmeth = (i: CommandInteraction) => drugExecute(i, "hitsmeth");
export const executeHitsweed = (i: CommandInteraction) => drugExecute(i, "hitsweed");
export const executeChugsdrink = (i: CommandInteraction) => drugExecute(i, "chugsdrink");
export const executePopspill = (i: CommandInteraction) => drugExecute(i, "popspill");
