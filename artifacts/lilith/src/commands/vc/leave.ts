import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import {
  getVoiceConnection,
} from "@discordjs/voice";
import { deleteMusicState } from "../../lib/music.js";

export const data = new SlashCommandBuilder()
  .setName("leave")
  .setDescription("Leave the voice channel");

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;

  const connection = getVoiceConnection(interaction.guildId);

  if (!connection) {
    return interaction.reply({ content: "I'm not in a voice channel.", ephemeral: true });
  }

  connection.destroy();
  deleteMusicState(interaction.guildId);
  await interaction.reply("Left. Finally.");
}
