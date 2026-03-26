import { DMChannel, GuildBan, GuildChannel, Role, Guild } from "discord.js";
import { trackChannelDelete, trackMassBan, trackRoleDelete } from "../lib/antinuke.js";

async function getExecutor(guild: Guild, actionType: number): Promise<string | null> {
  try {
    const logs = await guild.fetchAuditLogs({ limit: 1, type: actionType as any });
    const entry = logs.entries.first();
    if (!entry || !entry.executor) return null;
    // Only trust recent entries (within 5 seconds)
    if (Date.now() - entry.createdTimestamp > 5000) return null;
    return entry.executor.id;
  } catch {
    return null;
  }
}

export async function handleChannelDelete(channel: GuildChannel | DMChannel) {
  if (channel.isDMBased()) return;
  const guild = (channel as GuildChannel).guild;
  // Audit log action type 12 = CHANNEL_DELETE
  const executorId = await getExecutor(guild, 12);
  if (!executorId) return;
  await trackChannelDelete(guild, executorId);
}

export async function handleGuildBanAdd(ban: GuildBan) {
  // Audit log action type 22 = MEMBER_BAN_ADD
  const executorId = await getExecutor(ban.guild, 22);
  if (!executorId) return;
  await trackMassBan(ban.guild, executorId);
}

export async function handleRoleDelete(role: Role) {
  // Audit log action type 32 = ROLE_DELETE
  const executorId = await getExecutor(role.guild, 32);
  if (!executorId) return;
  await trackRoleDelete(role.guild, executorId);
}
