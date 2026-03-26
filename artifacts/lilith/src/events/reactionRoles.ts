import { MessageReaction, User, PartialMessageReaction, PartialUser } from "discord.js";
import { getReactionRoleForEmoji } from "../lib/db.js";

function emojiKey(reaction: MessageReaction | PartialMessageReaction): string {
  const e = reaction.emoji;
  return e.id ? `<${e.animated ? "a" : ""}:${e.name}:${e.id}>` : (e.name ?? "");
}

export async function handleReactionAdd(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (user.bot) return;
  if (!reaction.message.guild) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  const emoji = emojiKey(reaction);
  const row = await getReactionRoleForEmoji(
    reaction.message.guild.id,
    reaction.message.id,
    emoji
  );
  if (!row) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  await member.roles.add(row.role_id).catch(() => {});
}

export async function handleReactionRemove(
  reaction: MessageReaction | PartialMessageReaction,
  user: User | PartialUser
) {
  if (user.bot) return;
  if (!reaction.message.guild) return;

  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }

  const emoji = emojiKey(reaction);
  const row = await getReactionRoleForEmoji(
    reaction.message.guild.id,
    reaction.message.id,
    emoji
  );
  if (!row) return;

  const member = await reaction.message.guild.members.fetch(user.id).catch(() => null);
  if (!member) return;

  await member.roles.remove(row.role_id).catch(() => {});
}
