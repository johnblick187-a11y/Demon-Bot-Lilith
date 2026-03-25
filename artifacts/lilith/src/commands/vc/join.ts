import { SlashCommandBuilder, CommandInteraction, GuildMember } from "discord.js";
import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";
import { createMusicPlayer, setMusicState, getMusicState } from "../../lib/music.js";

export const data = new SlashCommandBuilder()
  .setName("join")
  .setDescription("Join your voice channel");

export async function execute(interaction: CommandInteraction) {
  const member = interaction.member as GuildMember;
  const vc = member.voice.channel;

  if (!vc) {
    return interaction.reply({ content: "Get in a voice channel first.", ephemeral: true });
  }

  const connection = joinVoiceChannel({
    channelId: vc.id,
    guildId: vc.guild.id,
    adapterCreator: vc.guild.voiceAdapterCreator,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
  } catch {
    connection.destroy();
    return interaction.reply({ content: "Couldn't connect to voice.", ephemeral: true });
  }

  const existing = getMusicState(vc.guild.id);
  if (!existing) {
    const player = createMusicPlayer(vc.guild.id, connection);
    setMusicState(vc.guild.id, {
      player,
      queue: [],
      currentSong: null,
      connection,
    });
  }

  await interaction.reply(`🎙️ Joined **${vc.name}**. Don't waste my time.`);
}
