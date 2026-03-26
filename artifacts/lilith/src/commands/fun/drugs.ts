import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { DRUG_RESPONSES } from "../../lib/constants.js";

function makeCommand(name: string, description: string) {
  return new SlashCommandBuilder().setName(name).setDescription(description);
}

export const hitsmethData = makeCommand("hitsmeth", "Hit some meth");
export const hitsweedData = makeCommand("hitsweed", "Hit some weed");
export const chugsdrinkData = makeCommand("chugsdrink", "Chug a drink");
export const popspillData = makeCommand("popspill", "Pop a pill");

async function drugExecute(
  interaction: CommandInteraction,
  key: keyof typeof DRUG_RESPONSES
) {
  const responses = DRUG_RESPONSES[key];
  const raw = responses[Math.floor(Math.random() * responses.length)];
  const username = interaction.user.username;
  const response = raw.replace(/\{user\}/g, `**${username}**`);
  await interaction.reply(response);
}

export const executeHitsmeth = (i: CommandInteraction) => drugExecute(i, "hitsmeth");
export const executeHitsweed = (i: CommandInteraction) => drugExecute(i, "hitsweed");
export const executeChugsdrink = (i: CommandInteraction) => drugExecute(i, "chugsdrink");
export const executePopspill = (i: CommandInteraction) => drugExecute(i, "popspill");
