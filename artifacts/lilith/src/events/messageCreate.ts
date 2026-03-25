import { Message, Client } from "discord.js";
import {
  getAutoreacts,
  getAutoreplies,
  getRelation,
  updateRelation,
  getGuildPrefix,
  getCustomCommand,
} from "../lib/db.js";
import { OWNER_ID } from "../lib/constants.js";

export async function handleMessageCreate(message: Message, client: Client) {
  if (message.author.bot) return;
  if (!message.guild) return;

  const userId = message.author.id;
  const content = message.content;
  const contentLower = content.toLowerCase();

  const [reacts, replies, prefix] = await Promise.all([
    getAutoreacts(message.guild.id),
    getAutoreplies(message.guild.id),
    getGuildPrefix(message.guild.id),
  ]);

  for (const react of reacts) {
    if (contentLower.includes(react.trigger)) {
      try {
        await message.react(react.emoji);
      } catch {}
    }
  }

  for (const reply of replies) {
    if (contentLower.includes(reply.trigger)) {
      await message.reply(reply.reply);
      break;
    }
  }

  if (message.mentions.has(client.user!)) {
    if (userId !== OWNER_ID) {
      await updateRelation(userId, { affinity: 1 });
    }
  }

  if (content.startsWith(prefix)) {
    const withoutPrefix = content.slice(prefix.length).trim();
    const commandName = withoutPrefix.split(/\s+/)[0]?.toLowerCase();
    if (!commandName) return;

    const effect = await getCustomCommand(message.guild.id, commandName);
    if (effect) {
      await message.reply(effect);
    }
  }
}
