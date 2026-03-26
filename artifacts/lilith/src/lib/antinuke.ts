import { Guild, User, TextChannel } from "discord.js";
import { OWNER_ID } from "./constants.js";
import { getAntiNukeSettings, getAntiRaidSettings } from "./db.js";

// ─── Anti-Nuke tracker ───────────────────────────────────────────────────────
// Map<guildId, Map<userId, { channelDeletes: number[]; bans: number[]; roleDeletes: number[] }>>
const nukeTracker = new Map<string, Map<string, {
  channelDeletes: number[];
  bans: number[];
  roleDeletes: number[];
}>>();

function getUserTracker(guildId: string, userId: string) {
  if (!nukeTracker.has(guildId)) nukeTracker.set(guildId, new Map());
  const guildMap = nukeTracker.get(guildId)!;
  if (!guildMap.has(userId)) {
    guildMap.set(userId, { channelDeletes: [], bans: [], roleDeletes: [] });
  }
  return guildMap.get(userId)!;
}

function pruneOld(timestamps: number[], windowMs: number) {
  const cutoff = Date.now() - windowMs;
  return timestamps.filter((t) => t > cutoff);
}

async function dmOwner(guild: Guild, message: string) {
  try {
    const owner = await guild.client.users.fetch(OWNER_ID);
    await owner.send(`🚨 **[${guild.name}]** ${message}`);
  } catch {}
}

async function punishNuker(guild: Guild, userId: string, reason: string) {
  if (userId === OWNER_ID) return;
  try {
    await guild.bans.create(userId, { reason: `[Anti-Nuke] ${reason}` });
  } catch {}
  await dmOwner(guild, `Anti-nuke triggered. <@${userId}> was banned. Reason: ${reason}`);
}

export async function trackChannelDelete(guild: Guild, executorId: string) {
  if (executorId === OWNER_ID) return;
  const settings = await getAntiNukeSettings(guild.id);
  if (!settings?.enabled) return;

  const windowMs = (settings.window_seconds ?? 10) * 1000;
  const threshold = settings.channel_threshold ?? 3;

  const tracker = getUserTracker(guild.id, executorId);
  tracker.channelDeletes = pruneOld(tracker.channelDeletes, windowMs);
  tracker.channelDeletes.push(Date.now());

  if (tracker.channelDeletes.length >= threshold) {
    tracker.channelDeletes = [];
    await punishNuker(guild, executorId, `Mass channel deletion (${threshold}+ channels in ${settings.window_seconds}s)`);
  }
}

export async function trackMassBan(guild: Guild, executorId: string) {
  if (executorId === OWNER_ID) return;
  const settings = await getAntiNukeSettings(guild.id);
  if (!settings?.enabled) return;

  const windowMs = (settings.window_seconds ?? 10) * 1000;
  const threshold = settings.ban_threshold ?? 5;

  const tracker = getUserTracker(guild.id, executorId);
  tracker.bans = pruneOld(tracker.bans, windowMs);
  tracker.bans.push(Date.now());

  if (tracker.bans.length >= threshold) {
    tracker.bans = [];
    await punishNuker(guild, executorId, `Mass ban (${threshold}+ bans in ${settings.window_seconds}s)`);
  }
}

export async function trackRoleDelete(guild: Guild, executorId: string) {
  if (executorId === OWNER_ID) return;
  const settings = await getAntiNukeSettings(guild.id);
  if (!settings?.enabled) return;

  const windowMs = (settings.window_seconds ?? 10) * 1000;
  const threshold = settings.role_threshold ?? 3;

  const tracker = getUserTracker(guild.id, executorId);
  tracker.roleDeletes = pruneOld(tracker.roleDeletes, windowMs);
  tracker.roleDeletes.push(Date.now());

  if (tracker.roleDeletes.length >= threshold) {
    tracker.roleDeletes = [];
    await punishNuker(guild, executorId, `Mass role deletion (${threshold}+ roles in ${settings.window_seconds}s)`);
  }
}

// ─── Anti-Raid tracker ───────────────────────────────────────────────────────
// Map<guildId, number[]> — timestamps of recent joins
const raidTracker = new Map<string, number[]>();

export async function trackMemberJoin(guild: Guild) {
  const settings = await getAntiRaidSettings(guild.id);
  if (!settings?.enabled) return;

  const windowMs = (settings.window_seconds ?? 30) * 1000;
  const threshold = settings.join_threshold ?? 10;

  const joins = raidTracker.get(guild.id) ?? [];
  const pruned = pruneOld(joins, windowMs);
  pruned.push(Date.now());
  raidTracker.set(guild.id, pruned);

  if (pruned.length >= threshold) {
    // Reset to avoid spam-triggering
    raidTracker.set(guild.id, []);

    await dmOwner(
      guild,
      `⚠️ **Raid detected!** ${threshold}+ members joined in ${settings.window_seconds}s. Invites have been paused and verification raised.`
    );

    // Pause invites by raising verification level
    try {
      await guild.setVerificationLevel(4); // VERY_HIGH
    } catch {}

    // Pause all invites
    try {
      const invites = await guild.invites.fetch();
      for (const invite of invites.values()) {
        await invite.delete("Anti-raid: raid detected").catch(() => {});
      }
    } catch {}
  }
}
