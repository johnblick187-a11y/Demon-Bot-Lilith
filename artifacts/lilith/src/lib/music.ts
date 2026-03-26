import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  StreamType,
} from "@discordjs/voice";
import { spawn } from "child_process";
import { Readable } from "stream";

interface QueueEntry {
  title: string;
  url: string;
  requestedBy: string;
  isDirect?: boolean;
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

function ytDlpSearch(query: string): Promise<{ title: string; url: string } | null> {
  return new Promise((resolve) => {
    const searchTarget = query.startsWith("http") ? query : `ytsearch1:${query}`;
    const proc = spawn("yt-dlp", [
      searchTarget,
      "--no-playlist",
      "--print", "%(title)s|||%(webpage_url)s",
      "--no-warnings",
      "--quiet",
    ]);

    let output = "";
    proc.stdout.on("data", (chunk) => { output += chunk.toString(); });
    proc.stderr.on("data", () => {});

    proc.on("close", () => {
      const line = output.trim().split("\n")[0];
      if (!line || !line.includes("|||")) return resolve(null);
      const [title, url] = line.split("|||");
      if (!title || !url) return resolve(null);
      resolve({ title: title.trim(), url: url.trim() });
    });

    proc.on("error", () => resolve(null));
    setTimeout(() => { proc.kill(); resolve(null); }, 15_000);
  });
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
  proc.on("error", () => {});
  return proc.stdout as unknown as Readable;
}

function streamDirectUrl(url: string): Readable {
  const proc = spawn("ffmpeg", [
    "-i", url,
    "-f", "s16le",
    "-ar", "48000",
    "-ac", "2",
    "pipe:1",
  ]);
  proc.stderr.on("data", () => {});
  proc.on("error", () => {});
  return proc.stdout as unknown as Readable;
}

export async function searchAndQueue(
  guildId: string,
  query: string,
  requestedBy: string
): Promise<{ title: string; queued: boolean } | null> {
  const result = await ytDlpSearch(query);
  if (!result) return null;

  const state = guildMusicMap.get(guildId);
  if (!state) return null;

  const entry: QueueEntry = { title: result.title, url: result.url, requestedBy };
  state.queue.push(entry);

  if (state.player.state.status === AudioPlayerStatus.Idle) {
    await playNext(guildId);
    return { title: result.title, queued: false };
  }

  return { title: result.title, queued: true };
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
    const stream = next.isDirect ? streamDirectUrl(next.url) : streamViaYtDlp(next.url);
    const resource = createAudioResource(stream, {
      inputType: next.isDirect ? StreamType.Raw : StreamType.Arbitrary,
    });
    state.player.play(resource);
    return true;
  } catch {
    return await playNext(guildId);
  }
}

export function queueDirectFile(
  guildId: string,
  title: string,
  url: string,
  requestedBy: string
): { queued: boolean } | null {
  const state = guildMusicMap.get(guildId);
  if (!state) return null;

  const entry: QueueEntry = { title, url, requestedBy, isDirect: true };
  state.queue.push(entry);

  if (state.player.state.status === AudioPlayerStatus.Idle) {
    playNext(guildId);
    return { queued: false };
  }
  return { queued: true };
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
