import {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnection,
  AudioPlayer,
  NoSubscriberBehavior,
  demuxProbe,
} from "@discordjs/voice";
import { Readable } from "stream";
import play from "play-dl";

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

void play.setToken({
  youtube: {
    cookie: process.env.YOUTUBE_COOKIE,
  },
  soundcloud: {
    client_id: process.env.SOUNDCLOUD_CLIENT_ID,
  },
});

export function getMusicState(guildId: string): GuildMusic | undefined {
  return guildMusicMap.get(guildId);
}

export function setMusicState(guildId: string, state: GuildMusic) {
  guildMusicMap.set(guildId, state);
}

export function deleteMusicState(guildId: string) {
  guildMusicMap.delete(guildId);
}

async function resolveTrack(query: string): Promise<{ title: string; url: string } | null> {
  try {
    if (play.yt_validate(query) === "video") {
      const info = await play.video_basic_info(query);
      return {
        title: info.video_details.title ?? "YouTube video",
        url: info.video_details.url,
      };
    }

    if (play.sp_validate(query) === "track") {
      const sp = await play.spotify(query);
      const track = await sp.fetch();
      const search = `${track.name} ${track.artists?.map((a) => a.name).join(" ") ?? ""}`.trim();
      return await resolveTrack(search);
    }

    if (play.so_validate(query) === "track") {
      const info = await play.soundcloud(query);
      return {
        title: info.name ?? "SoundCloud track",
        url: info.url,
      };
    }

    const results = await play.search(query, {
      limit: 1,
      source: { youtube: "video" },
    });

    const first = results[0];
    if (!first) return null;

    return {
      title: first.title ?? "Unknown title",
      url: first.url,
    };
  } catch {
    return null;
  }
}

async function createResourceForEntry(entry: QueueEntry) {
  if (entry.isDirect) {
    const response = await fetch(entry.url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to fetch direct file: ${response.status}`);
    }

    const webStream = response.body as unknown as ReadableStream<Uint8Array>;
    const nodeStream = Readable.fromWeb(webStream);
    const probed = await demuxProbe(nodeStream);

    return createAudioResource(probed.stream, {
      inputType: probed.type,
    });
  }

  if (play.yt_validate(entry.url) === "video" || play.so_validate(entry.url) === "track") {
    const stream = await play.stream(entry.url, {
      discordPlayerCompatibility: true,
      quality: 2,
    });

    return createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: false,
    });
  }

  throw new Error("Unsupported track source");
}

export async function searchAndQueue(
  guildId: string,
  query: string,
  requestedBy: string
): Promise<{ title: string; queued: boolean } | null> {
  const result = await resolveTrack(query);
  if (!result) return null;

  const state = guildMusicMap.get(guildId);
  if (!state) return null;

  const entry: QueueEntry = {
    title: result.title,
    url: result.url,
    requestedBy,
  };

  state.queue.push(entry);

  if (state.player.state.status === AudioPlayerStatus.Idle && !state.currentSong) {
    await playNext(guildId);
    return { title: result.title, queued: false };
  }

  return { title: result.title, queued: true };
}

export async function playNext(guildId: string): Promise<boolean> {
  const state = guildMusicMap.get(guildId);
  if (!state) return false;

  const next = state.queue.shift();
  if (!next) {
    state.currentSong = null;
    return false;
  }

  state.currentSong = next;

  try {
    const resource = await createResourceForEntry(next);
    state.player.play(resource);
    return true;
  } catch (error) {
    console.error("[music] failed to play track", {
      guildId,
      title: next.title,
      url: next.url,
      error,
    });

    state.currentSong = null;
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

  const entry: QueueEntry = {
    title,
    url,
    requestedBy,
    isDirect: true,
  };

  state.queue.push(entry);

  if (state.player.state.status === AudioPlayerStatus.Idle && !state.currentSong) {
    void playNext(guildId);
    return { queued: false };
  }

  return { queued: true };
}

export function createMusicPlayer(
  guildId: string,
  connection: VoiceConnection
): AudioPlayer {
  const player = createAudioPlayer({
    behaviors: {
      noSubscriber: NoSubscriberBehavior.Pause,
    },
  });

  player.on(AudioPlayerStatus.Idle, async () => {
    const state = guildMusicMap.get(guildId);
    if (!state) return;

    state.currentSong = null;
    await playNext(guildId);
  });

  player.on("error", async (error) => {
    console.error("[music] audio player error", { guildId, error });

    const state = guildMusicMap.get(guildId);
    if (!state) return;

    state.currentSong = null;
    await playNext(guildId);
  });

  connection.subscribe(player);
  return player;
}