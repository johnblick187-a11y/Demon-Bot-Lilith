import { Message, Client } from "discord.js";
import { getAutoreacts, getAutoreplies, getRelation, updateRelation } from "../lib/db.js";
import { OWNER_ID } from "../lib/constants.js";

export async function handleMessageCreate(message: Message, client: Client) {
  if (message.author.bot) return;
  if (!message.guild) return;

  const userId = message.author.id;
  const content = message.content.toLowerCase();

  const [reacts, replies] = await Promise.all([
    getAutoreacts(message.guild.id),
    getAutoreplies(message.guild.id),
  ]);

  for (const react of reacts) {
    if (content.includes(react.trigger)) {
      try {
        await message.react(react.emoji);
      } catch {}
    }
  }

  for (const reply of replies) {
    if (content.includes(reply.trigger)) {
      await message.reply(reply.reply);
      break;
    }
  }

  if (message.mentions.has(client.user!)) {
    if (userId !== OWNER_ID) {
      await updateRelation(userId, { affinity: 1 });
    }
  }
}
