import { Message, Client } from "discord.js";
import {
  getAutoreacts,
  getAutoreplies,
  updateRelation,
  getGuildPrefix,
  getGuildUserPrefix,
  getCustomCommands,
  canUseCustomCommandToday,
  recordCustomCommandUsage,
} from "../lib/db.js";
import { OWNER_ID } from "../lib/constants.js";

export async function handleMessageCreate(message: Message, client: Client) {
  if (message.author.bot) return;
  if (!message.guild) return;

  const userId = message.author.id;
  const content = message.content;
  const contentLower = content.toLowerCase();

  const [reacts, replies, guildPrefix, userPrefix, allCommands] = await Promise.all([
    getAutoreacts(message.guild.id),
    getAutoreplies(message.guild.id),
    getGuildPrefix(message.guild.id),
    getGuildUserPrefix(message.guild.id, userId),
    getCustomCommands(message.guild.id),
  ]);

  const effectivePrefix = userPrefix ?? guildPrefix;

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

  for (const cmd of allCommands) {
    const triggerPrefix = cmd.locked_prefix ?? effectivePrefix;
    if (!content.startsWith(triggerPrefix)) continue;

    const withoutPrefix = content.slice(triggerPrefix.length).trim();
    const commandName = withoutPrefix.split(/\s+/)[0]?.toLowerCase();
    if (commandName !== cmd.command_name) continue;

    if (cmd.daily_limit) {
      const allowed = await canUseCustomCommandToday(message.guild.id, userId, cmd.command_name);
      if (!allowed) {
        await message.reply(
          `You've already used \`${triggerPrefix}${cmd.command_name}\` twice this month. Come back next month.`
        );
        return;
      }
      await recordCustomCommandUsage(message.guild.id, userId, cmd.command_name);
    }

    await message.reply(cmd.effect);
    return;
  }
}
