import { GuildMember, EmbedBuilder, TextChannel } from "discord.js";
import { recordInviteUse, markMemberLeft, getLevelChannel } from "../lib/db.js";
import { findInviterOnJoin } from "../lib/inviteCache.js";

export async function handleGuildMemberAdd(member: GuildMember) {
  const { inviterId, code } = await findInviterOnJoin(member.guild);

  if (inviterId && inviterId !== "unknown" && code) {
    await recordInviteUse(
      member.guild.id,
      inviterId,
      member.id,
      code
    ).catch(() => {});
  }

  // Send a join log to level channel (or skip if not set)
  const channelId = await getLevelChannel(member.guild.id).catch(() => null);
  if (!channelId) return;

  const channel = member.guild.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel) return;

  const inviterText = inviterId && inviterId !== "unknown"
    ? `Invited by <@${inviterId}>${code ? ` (\`${code}\`)` : ""}`
    : "Invite unknown";

  const embed = new EmbedBuilder()
    .setAuthor({ name: member.user.username, iconURL: member.user.displayAvatarURL() })
    .setDescription(`<@${member.id}> joined the server.\n${inviterText}`)
    .setColor(0x2ecc71)
    .setTimestamp();

  channel.send({ embeds: [embed] }).catch(() => {});
}

export async function handleGuildMemberRemove(member: GuildMember) {
  await markMemberLeft(member.guild.id, member.id).catch(() => {});
}
