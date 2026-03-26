import { Collection, Guild, Invite } from "discord.js";

// In-memory cache: guildId → Map<inviteCode, { uses, inviterId }>
const cache = new Map<string, Map<string, { uses: number; inviterId: string }>>();

export async function cacheGuildInvites(guild: Guild) {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map<string, { uses: number; inviterId: string }>();
    for (const invite of invites.values()) {
      if (invite.code && invite.uses !== null) {
        map.set(invite.code, {
          uses: invite.uses ?? 0,
          inviterId: invite.inviterId ?? invite.inviter?.id ?? "unknown",
        });
      }
    }
    cache.set(guild.id, map);
  } catch {
    // Bot may not have Manage Guild permission
  }
}

export async function cacheAllGuilds(guilds: Collection<string, Guild>) {
  for (const guild of guilds.values()) {
    await cacheGuildInvites(guild);
  }
}

// Call when a member joins — returns the inviterId or null if can't determine
export async function findInviterOnJoin(
  guild: Guild
): Promise<{ inviterId: string | null; code: string | null }> {
  const oldMap = cache.get(guild.id) ?? new Map();

  try {
    const newInvites = await guild.invites.fetch();
    let usedCode: string | null = null;
    let inviterId: string | null = null;

    for (const invite of newInvites.values()) {
      const old = oldMap.get(invite.code);
      const oldUses = old?.uses ?? 0;
      const newUses = invite.uses ?? 0;

      if (newUses > oldUses) {
        usedCode = invite.code;
        inviterId = invite.inviterId ?? invite.inviter?.id ?? old?.inviterId ?? null;
        break;
      }
    }

    // Update cache with new state
    const updatedMap = new Map<string, { uses: number; inviterId: string }>();
    for (const invite of newInvites.values()) {
      updatedMap.set(invite.code, {
        uses: invite.uses ?? 0,
        inviterId: invite.inviterId ?? invite.inviter?.id ?? "unknown",
      });
    }
    cache.set(guild.id, updatedMap);

    return { inviterId, code: usedCode };
  } catch {
    return { inviterId: null, code: null };
  }
}

export function updateCacheOnInviteCreate(invite: Invite) {
  if (!invite.guild) return;
  const map = cache.get(invite.guild.id) ?? new Map();
  map.set(invite.code, {
    uses: invite.uses ?? 0,
    inviterId: invite.inviterId ?? invite.inviter?.id ?? "unknown",
  });
  cache.set(invite.guild.id, map);
}

export function updateCacheOnInviteDelete(invite: Invite) {
  if (!invite.guild) return;
  const map = cache.get(invite.guild.id);
  if (map) map.delete(invite.code);
}
