import { Message, Client, EmbedBuilder, TextChannel } from "discord.js";
import {
  getAutoreacts,
  getAutoreplies,
  getRelation,
  updateRelation,
  getGuildPrefix,
  getGuildUserPrefix,
  getCustomCommands,
  canUseCustomCommandToday,
  recordCustomCommandUsage,
  getChatEnabled,
  getUserAutoreacts,
  getUserAutoreplies,
  getConversationHistory,
  getConversationSummaryRecord,
  saveConversationTurn,
  getMessagesToSummarize,
  saveConversationSummary,
  deleteMessagesByIds,
  addXp,
  setLevelInDb,
  getLevelChannel,
  getLevelRoleForLevel,
} from "../lib/db.js";
import { OWNER_ID, BOT_MULTIPLIER, AFFINITY_TABLE } from "../lib/constants.js";
import { askLilith, computeMode, summarizeConversation } from "../lib/ai.js";
import { runAutomod } from "../lib/automod.js";
import { randomXp, isOnCooldown, computeLevel } from "../lib/xp.js";

export async function handleMessageCreate(message: Message, client: Client) {
  if (!message.guild) return;

  // Run automod on every message (has its own guards inside)
  runAutomod(message).catch(() => {});

  // Grant XP (fire-and-forget, human messages only, 60s cooldown)
  if (!message.author.bot && !isOnCooldown(message.guild.id, message.author.id)) {
    (async () => {
      const xpGain = randomXp();
      const { newXp, oldLevel } = await addXp(message.guild.id, message.author.id, xpGain);
      const { level: newLevel } = computeLevel(newXp);
      if (newLevel > oldLevel) {
        // Update level in DB
        await setLevelInDb(message.guild.id, message.author.id, newLevel);
        // Assign level role if configured
        const roleId = await getLevelRoleForLevel(message.guild.id, newLevel);
        if (roleId) {
          const member = await message.guild.members.fetch(message.author.id).catch(() => null);
          if (member) await member.roles.add(roleId).catch(() => {});
        }
        // Announce level-up
        const levelChannelId = await getLevelChannel(message.guild.id);
        const announceChannel = levelChannelId
          ? (message.guild.channels.cache.get(levelChannelId) as TextChannel | undefined) ?? null
          : (message.channel as TextChannel);
        if (announceChannel) {
          const embed = new EmbedBuilder()
            .setDescription(`🎉 <@${message.author.id}> leveled up to **Level ${newLevel}**!${roleId ? ` You've been given <@&${roleId}>.` : ""}`)
            .setColor(0xf1c40f);
          announceChannel.send({ embeds: [embed] }).catch(() => {});
        }
      }
    })().catch(() => {});
  }

  if (message.author.bot) {
    if (message.author.id === client.user?.id) return;
    const contentLower = message.content.toLowerCase();
    const reacts = await getAutoreacts(message.guild.id);
    const replies = await getAutoreplies(message.guild.id);
    let triggered = false;
    for (const react of reacts) {
      if (contentLower.includes(react.trigger)) {
        try { await message.react(react.emoji); } catch {}
        triggered = true;
      }
    }
    for (const reply of replies) {
      if (contentLower.includes(reply.trigger)) {
        await message.reply(reply.reply);
        triggered = true;
        break;
      }
    }
    if (triggered) {
      await updateRelation(message.author.id, { annoyance: 1 * BOT_MULTIPLIER });
    }
    return;
  }

  const userId = message.author.id;
  const content = message.content;
  const contentLower = content.toLowerCase();

  const [reacts, replies, guildPrefix, userPrefix, allCommands, userEmojis, userReplies] = await Promise.all([
    getAutoreacts(message.guild.id),
    getAutoreplies(message.guild.id),
    getGuildPrefix(message.guild.id),
    getGuildUserPrefix(message.guild.id, userId),
    getCustomCommands(message.guild.id),
    getUserAutoreacts(message.guild.id, userId),
    getUserAutoreplies(message.guild.id, userId),
  ]);

  const effectivePrefix = userPrefix ?? guildPrefix;

  for (const react of reacts) {
    if (contentLower.includes(react.trigger)) {
      try {
        await message.react(react.emoji);
      } catch {}
    }
  }

  for (const emoji of userEmojis) {
    try { await message.react(emoji); } catch {}
  }

  for (const text of userReplies) {
    try { await message.reply(text); } catch {}
  }

  for (const reply of replies) {
    if (contentLower.includes(reply.trigger)) {
      await message.reply(reply.reply);
      break;
    }
  }

  const isMentioned = message.mentions.has(client.user!);
  const isReplyToLilith = message.reference?.messageId
    ? (await message.channel.messages.fetch(message.reference.messageId).catch(() => null))?.author?.id === client.user?.id
    : false;

  if (isMentioned || isReplyToLilith) {
    const isOwner = userId === OWNER_ID;
    const rel = isOwner
      ? { affinity: 100, annoyance: 0, blacklisted: false, enemy: false }
      : await getRelation(userId, message.author.username);

    if (rel.blacklisted) return;

    const query = message.content
      .replace(/<@!?\d+>/g, "")
      .trim() || "...";

    try {
      await message.channel.sendTyping();
      const [history, summaryRecord] = await Promise.all([
        getConversationHistory(message.guild.id, userId),
        getConversationSummaryRecord(message.guild.id, userId),
      ]);
      const response = await askLilith(query, {
        userId,
        username: message.author.username,
        affinity: rel.affinity,
        annoyance: rel.annoyance,
        isOwner,
        mode: "chat",
        enemy: (rel as any).enemy ?? false,
        history,
        memorySummary: summaryRecord?.summary ?? null,
      });
      await message.reply(response);
      await saveConversationTurn(message.guild.id, userId, query, response);

      // Fire-and-forget: compress old messages into rolling summary
      (async () => {
        try {
          const toSummarize = await getMessagesToSummarize(message.guild.id, userId);
          if (!toSummarize || toSummarize.length === 0) return;
          const existing = summaryRecord?.summary ?? null;
          const newSummary = await summarizeConversation(existing, toSummarize);
          const totalCovered = (summaryRecord?.messages_covered ?? 0) + toSummarize.length;
          await saveConversationSummary(message.guild.id, userId, newSummary, totalCovered);
          await deleteMessagesByIds(toSummarize.map((m) => m.id));
        } catch {}
      })();
    } catch {}

    if (!isOwner) {
      await updateRelation(userId, { affinity: AFFINITY_TABLE.mention });
    }
    return;
  }

  for (const cmd of allCommands) {
    const triggerPrefix = cmd.locked_prefix ?? effectivePrefix;
    if (!content.startsWith(triggerPrefix)) continue;

    const withoutPrefix = content.slice(triggerPrefix.length).trim();
    const parts = withoutPrefix.split(/\s+/);
    const commandName = parts[0]?.toLowerCase();
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

    // Resolve {user} placeholder — first @mention in the message, else author
    const mentionMatch = message.content.match(/<@!?(\d+)>/);
    const mentionedUser = mentionMatch
      ? (await message.guild!.members.fetch(mentionMatch[1]).catch(() => null))
      : null;
    const userStr = mentionedUser
      ? `<@${mentionedUser.id}>`
      : `**${message.author.displayName ?? message.author.username}**`;

    const resolvedContent = (cmd.effect ?? "").replace(/\{user\}/gi, userStr);
    const effectType = cmd.effect_type ?? "text";

    if (effectType === "action") {
      await message.channel.send(`*${resolvedContent}*`);
      return;
    }

    if (effectType === "embed") {
      const embed = new EmbedBuilder().setDescription(resolvedContent).setColor(
        cmd.embed_color ? (parseInt(cmd.embed_color) as any) : 0x8b0000
      );
      if (cmd.embed_title) embed.setTitle(cmd.embed_title);
      if (cmd.image_url) embed.setImage(cmd.image_url);
      await message.channel.send({ embeds: [embed] });
      return;
    }

    // text (default)
    const payload: any = { content: resolvedContent };
    if (cmd.image_url) payload.files = [cmd.image_url];
    await message.reply(payload);
    return;
  }

  if (content.trim().length < 8) return;
  if (effectivePrefix && content.startsWith(effectivePrefix)) return;

  const chatEnabled = await getChatEnabled(message.guild.id);
  if (!chatEnabled) return;

  const isOwner = userId === OWNER_ID;
  const rel = isOwner
    ? { affinity: 100, annoyance: 0, blacklisted: false, enemy: false }
    : await getRelation(userId, message.author.username);

  if (rel.blacklisted) return;

  const mode = computeMode(rel.affinity, rel.annoyance, (rel as any).enemy ?? false);
  const chanceByMode: Record<string, number> = { default: 0.30, angry: 0.55, chaos: 0.75 };
  const chance = chanceByMode[mode] ?? 0.30;

  if (Math.random() > chance) return;

  try {
    await message.channel.sendTyping();
    const response = await askLilith(content.trim(), {
      userId,
      username: message.author.username,
      affinity: rel.affinity,
      annoyance: rel.annoyance,
      isOwner,
      mode: "chat",
      enemy: (rel as any).enemy ?? false,
    } as any);
    await message.reply(response);
  } catch {}
}
