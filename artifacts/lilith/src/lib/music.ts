import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  StreamType,
} from "@discordjs/voice";
import play from "play-dl";
import { spawn } from "child_process";
import { Readable } from "stream";

interface QueueEntry {
  title: string;
  url: string;
  requestedBy: string;
}

interface GuildMusic {
  player: AudioPlayer;
  queue: QueueEntry[];
  currentSong: QueueEntry | null;
  connection: VoiceConnection;
}

const guildMusicMap = new Map<string, GuildMusic>();

export function getMusicState(guildId: string): GuildMusic | undefined {
  return guildMusicMap.get(guildId);
}

export function setMusicState(guildId: string, state: GuildMusic) {
  guildMusicMap.set(guildId, state);
}

export function deleteMusicState(guildId: string) {
  guildMusicMap.delete(guildId);
}

function streamViaYtDlp(url: string): Readable {
  const proc = spawn("yt-dlp", [
    "-f", "bestaudio",
    "--no-playlist",
    "-o", "-",
    "--quiet",
    url,
  ]);
  proc.stderr.on("data", () => {});
  return proc.stdout as unknown as Readable;
}

export async function searchAndQueue(
  guildId: string,
  query: string,
  requestedBy: string
): Promise<{ title: string; queued: boolean } | null> {
  let url = query;
  let title = query;

  if (!query.startsWith("http")) {
    const searched = await play.search(query, { limit: 1 });
    if (!searched || searched.length === 0) return null;
    url = searched[0].url;
    title = searched[0].title ?? query;
  } else {
    try {
      const info = await play.video_info(url);
      title = info.video_details.title ?? url;
    } catch {
      title = url;
    }
  }

  const state = guildMusicMap.get(guildId);
  if (!state) return null;

  const entry: QueueEntry = { title, url, requestedBy };
  state.queue.push(entry);

  if (state.player.state.status === AudioPlayerStatus.Idle) {
    await playNext(guildId);
    return { title, queued: false };
  }

  return { title, queued: true };
}

export async function playNext(guildId: string): Promise<boolean> {
  const state = guildMusicMap.get(guildId);
  if (!state || state.queue.length === 0) {
    if (state) state.currentSong = null;
    return false;
  }

  const next = state.queue.shift()!;
  state.currentSong = next;

  try {
    const stream = streamViaYtDlp(next.url);
    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });
    state.player.play(resource);
    return true;
  } catch {
    return await playNext(guildId);
  }
}

export function createMusicPlayer(guildId: string, connection: VoiceConnection): AudioPlayer {
  const player = createAudioPlayer();

  player.on(AudioPlayerStatus.Idle, async () => {
    const state = guildMusicMap.get(guildId);
    if (state && state.queue.length > 0) {
      await playNext(guildId);
    } else if (state) {
      state.currentSong = null;
    }
  });

  connection.subscribe(player);
  return player;
}
