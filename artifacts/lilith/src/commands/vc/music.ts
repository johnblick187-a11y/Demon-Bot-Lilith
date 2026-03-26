import {
  SlashCommandBuilder,
  CommandInteraction,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import { AudioPlayerStatus } from "@discordjs/voice";
import {
  getMusicState,
  searchAndQueue,
  queueDirectFile,
  playNext,
  setMusicState,
  createMusicPlayer,
} from "../../lib/music.js";
import {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
} from "@discordjs/voice";

export const playData = new SlashCommandBuilder()
  .setName("play")
  .setDescription("Play a song — search by name/URL or upload an audio file")
  .addStringOption((opt) =>
    opt.setName("song").setDescription("Song name or URL").setRequired(false)
  )
  .addAttachmentOption((opt) =>
    opt.setName("file").setDescription("Upload an audio file to play").setRequired(false)
  );

export async function executePlay(interaction: CommandInteraction) {
  await interaction.deferReply();
  const query = (interaction.options as any).getString("song") as string | null;
  const attachment = (interaction.options as any).getAttachment("file") as any | null;
  const member = interaction.member as GuildMember;
  const vc = member.voice.channel;

  if (!query && !attachment) {
    return interaction.editReply("Give me a song name, URL, or upload a file.");
  }

  if (!vc) {
    return interaction.editReply("Get in a voice channel.");
  }

  if (!interaction.guildId) return;

  let state = getMusicState(interaction.guildId);
  if (!state) {
    const connection = joinVoiceChannel({
      channelId: vc.id,
      guildId: vc.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });
    try {
      await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    } catch {
      connection.destroy();
      return interaction.editReply("Couldn't connect to voice.");
    }
    const player = createMusicPlayer(interaction.guildId, connection);
    state = { player, queue: [], currentSong: null, connection };
    setMusicState(interaction.guildId, state);
  }

  // Handle uploaded audio file
  if (attachment) {
    const title = attachment.name ?? "Uploaded file";
    const result = queueDirectFile(interaction.guildId, title, attachment.url, interaction.user.username);
    if (!result) return interaction.editReply("Couldn't queue the file.");
    return interaction.editReply(
      result.queued ? `Queued **${title}**` : `Now playing **${title}**`
    );
  }

  const result = await searchAndQueue(interaction.guildId, query!, interaction.user.username);
  if (!result) {
    return interaction.editReply("Couldn't find that song. Try harder.");
  }

  if (result.queued) {
    await interaction.editReply(`🎵 Queued: **${result.title}**`);
  } else {
    await interaction.editReply(`🎵 Now playing: **${result.title}**`);
  }
}

export const pauseData = new SlashCommandBuilder().setName("pause").setDescription("Pause playback");
export async function executePause(interaction: CommandInteraction) {
  const state = getMusicState(interaction.guildId!);
  if (!state) return interaction.reply({ content: "Nothing is playing.", flags: 64 });
  state.player.pause();
  await interaction.reply("⏸️ Paused.");
}

export const resumeData = new SlashCommandBuilder().setName("resume").setDescription("Resume playback");
export async function executeResume(interaction: CommandInteraction) {
  const state = getMusicState(interaction.guildId!);
  if (!state) return interaction.reply({ content: "Nothing to resume.", flags: 64 });
  state.player.unpause();
  await interaction.reply("▶️ Resumed.");
}

export const skipData = new SlashCommandBuilder().setName("skip").setDescription("Skip the current song");
export async function executeSkip(interaction: CommandInteraction) {
  const state = getMusicState(interaction.guildId!);
  if (!state) return interaction.reply({ content: "Nothing to skip.", flags: 64 });
  const hasNext = await playNext(interaction.guildId!);
  await interaction.reply(hasNext ? "⏭️ Skipped." : "⏭️ Skipped. Queue is empty.");
}

export const stopData = new SlashCommandBuilder().setName("stop").setDescription("Stop playback and clear queue");
export async function executeStop(interaction: CommandInteraction) {
  const state = getMusicState(interaction.guildId!);
  if (!state) return interaction.reply({ content: "Nothing playing.", flags: 64 });
  state.queue.length = 0;
  state.player.stop();
  state.currentSong = null;
  await interaction.reply("⏹️ Stopped. Queue cleared.");
}

export const queueData = new SlashCommandBuilder().setName("queue").setDescription("View the music queue");
export async function executeQueue(interaction: CommandInteraction) {
  const state = getMusicState(interaction.guildId!);
  if (!state || (!state.currentSong && state.queue.length === 0)) {
    return interaction.reply({ content: "Queue is empty.", flags: 64 });
  }

  const embed = new EmbedBuilder()
    .setTitle("🎵 Music Queue")
    .setColor(0x8b0000)
    .setDescription(
      [
        state.currentSong ? `**Now Playing:** ${state.currentSong.title}` : "Nothing playing.",
        state.queue.length > 0
          ? "\n**Up Next:**\n" +
            state.queue
              .slice(0, 10)
              .map((s, i) => `${i + 1}. ${s.title}`)
              .join("\n")
          : "\nQueue is empty after this.",
      ].join("\n")
    );

  await interaction.reply({ embeds: [embed] });
}
