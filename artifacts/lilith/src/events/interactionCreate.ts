import { Interaction, Client } from "discord.js";
import { getRelation } from "../lib/db.js";
import { OWNER_ID } from "../lib/constants.js";

export async function handleInteractionCreate(
  interaction: Interaction,
  client: Client,
  commandMap: Map<string, (interaction: any, client: Client) => Promise<void>>
) {
  if (!interaction.isChatInputCommand()) return;

  const userId = interaction.user.id;

  if (userId !== OWNER_ID) {
    const rel = await getRelation(userId, interaction.user.username);
    if (rel.blacklisted) {
      await interaction.reply({
        content: "You're blacklisted. You have no commands. Go away.",
        ephemeral: true,
      });
      return;
    }
  }

  const handler = commandMap.get(interaction.commandName);
  if (!handler) {
    await interaction.reply({ content: "Unknown command.", ephemeral: true });
    return;
  }

  try {
    await handler(interaction, client);
  } catch (err) {
    console.error(`Error executing /${interaction.commandName}:`, err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "Something broke. Not my problem.", ephemeral: true });
    } else {
      await interaction.reply({ content: "Something broke. Not my problem.", ephemeral: true });
    }
  }
}
