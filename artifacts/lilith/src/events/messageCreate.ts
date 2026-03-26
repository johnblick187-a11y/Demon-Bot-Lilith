import { Message, Client, EmbedBuilder, TextChannel, AttachmentBuilder, GuildMember } from "discord.js";
import { joinVoiceChannel, VoiceConnectionStatus, entersState } from "@discordjs/voice";
import { getMusicState, searchAndQueue, playNext, setMusicState, createMusicPlayer } from "../lib/music.js";
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
  clearConversationHistory,
  addXp,
  setLevelInDb,
  getLevelChannel,
  getLevelRoleForLevel,
  getDmNsfwEnabled,
  setDmNsfwEnabled,
  getLilithMoodData,
} from "../lib/db.js";
import { OWNER_ID, BOT_MULTIPLIER, AFFINITY_TABLE, DRUG_RESPONSES } from "../lib/constants.js";
import { askLilith, askLilithNsfw, computeMode, summarizeConversation, generateTTS } from "../lib/ai.js";
import { runAutomod } from "../lib/automod.js";
import { randomXp, isOnCooldown, computeLevel } from "../lib/xp.js";

const recentlyProcessed = new Set<string>();

export async function handleMessageCreate(message: Message, client: Client) {
  if (recentlyProcessed.has(message.id)) return;
  recentlyProcessed.add(message.id);
  setTimeout(() => recentlyProcessed.delete(message.id), 10_000);
  // Handle DMs — owner only
  if (!message.guild) {
    if (message.author.bot) return;
    if (message.author.id !== OWNER_ID) return;

    const raw = message.content.trim();
    if (!raw) return;

    // + prefix commands
    if (raw.startsWith("+")) {
      const withoutPrefix = raw.slice(1).trim();
      const parts = withoutPrefix.split(/\s+/);
      const cmd = parts[0]?.toLowerCase();
      const args = parts.slice(1).join(" ");

      // +dmmode on/off/status
      if (cmd === "dmmode") {
        const action = args.toLowerCase();
        if (action === "status") {
          const enabled = await getDmNsfwEnabled();
          return void message.reply(`DM NSFW mode is **${enabled ? "ON" : "OFF"}**.`);
        }
        if (action === "on") {
          await setDmNsfwEnabled(true);
          return void message.reply("DM NSFW mode **ON**. I'll be waiting.");
        }
        if (action === "off") {
          await setDmNsfwEnabled(false);
          return void message.reply("DM NSFW mode **OFF**. Back to normal.");
        }
        return void message.reply("Usage: `+dmmode on` / `+dmmode off` / `+dmmode status`");
      }

      // +tts <text>
      if (cmd === "tts") {
        if (!args) return void message.reply("Usage: `+tts <text>`");
        try {
          await message.channel.sendTyping();
          const buf = await generateTTS(args);
          const attachment = new AttachmentBuilder(buf, { name: "lilith_tts.mp3" });
          return void message.reply({ content: `🎙️ *"${args}"*`, files: [attachment] });
        } catch {
          return void message.reply("TTS failed.");
        }
      }

      // +mood
      if (cmd === "mood") {
        const MOODS = [
          { min: 0,  max: 15,  mood: "Murderous",             emoji: "🩸", color: 0x8b0000 },
          { min: 16, max: 30,  mood: "Seething",               emoji: "🔥", color: 0xff0000 },
          { min: 31, max: 45,  mood: "Irritated",              emoji: "😤", color: 0xff4500 },
          { min: 46, max: 60,  mood: "Indifferent",            emoji: "😑", color: 0x4a4a4a },
          { min: 61, max: 75,  mood: "Amused",                 emoji: "😏", color: 0x9932cc },
          { min: 76, max: 90,  mood: "Dangerously Good",       emoji: "😈", color: 0x6a0dad },
          { min: 91, max: 100, mood: "Suspiciously Pleasant",  emoji: "🖤", color: 0x2a0050 },
        ];
        const { avgAnnoyance, enemyCount, userCount } = await getLilithMoodData();
        const hour = new Date().getHours();
        const timeFactor = Math.round(Math.sin((hour / 24) * Math.PI * 2) * 8);
        const score = Math.max(0, Math.min(100, 100 - avgAnnoyance - enemyCount * 8 + timeFactor));
        const entry = MOODS.find((m) => score >= m.min && score <= m.max) ?? MOODS[3];
        const bar = "🟪".repeat(Math.round(score / 10)) + "⬛".repeat(10 - Math.round(score / 10));
        const embed = new EmbedBuilder()
          .setTitle(`${entry.emoji} Lilith's Current Mood`)
          .setColor(entry.color)
          .setDescription(`**${entry.mood}**\n\n${bar}\n\nMood Index: **${score}/100**`)
          .addFields(
            { name: "Avg. Annoyance", value: `${avgAnnoyance}/100`, inline: true },
            { name: "Active Enemies", value: `${enemyCount}`, inline: true },
            { name: "Users Tracked", value: `${userCount}`, inline: true }
          );
        return void message.reply({ embeds: [embed] });
      }

      // +affinity
      if (cmd === "affinity") {
        const rel = await getRelation(OWNER_ID, message.author.username);
        return void message.reply(`Your affinity with me: **${rel.affinity}/100**.`);
      }

      // +annoyance
      if (cmd === "annoyance") {
        const rel = await getRelation(OWNER_ID, message.author.username);
        return void message.reply(`Your annoyance level: **${rel.annoyance}/100**.`);
      }

      // drug commands
      if (cmd === "hitsmeth" || cmd === "hitsweed" || cmd === "chugsdrink" || cmd === "popspill") {
        const key = cmd as keyof typeof DRUG_RESPONSES;
        const lines = DRUG_RESPONSES[key];
        const line = lines[Math.floor(Math.random() * lines.length)];
        return void message.channel.send(line.replace(/\{user\}/gi, `**${message.author.displayName ?? message.author.username}**`));
      }

      // +clear — flush poisoned conversation history
      if (cmd === "clear") {
        await clearConversationHistory("GLOBAL", OWNER_ID);
        return void message.reply("Memory wiped. Fresh start.");
      }

      // +help
      if (cmd === "help") {
        return void message.reply(
          "**DM commands (+ prefix)**\n" +
          "`+dmmode on/off/status` — toggle NSFW DM mode\n" +
          "`+tts <text>` — hear my voice\n" +
          "`+mood` — my current mood\n" +
          "`+affinity` — your affinity with me\n" +
          "`+annoyance` — your annoyance level\n" +
          "`+clear` — wipe conversation memory\n" +
          "`+hitsmeth` `+hitsweed` `+chugsdrink` `+popspill` — you know what these do\n\n" +
          "Anything else you send me — I'll respond."
        );
      }

      return void message.reply(`Unknown command. Try \`+help\`.`);
    }

    // No prefix — AI responds
    const dmNsfwEnabled = await getDmNsfwEnabled();
    try {
      await message.channel.sendTyping();
      const [history, summaryRecord] = await Promise.all([
        getConversationHistory("GLOBAL", OWNER_ID),
        getConversationSummaryRecord("GLOBAL", OWNER_ID),
      ]);
      const rawResponse = dmNsfwEnabled
        ? await askLilithNsfw(raw, {
            history,
            memorySummary: summaryRecord?.summary ?? null,
          })
        : await askLilith(raw, {
            userId: OWNER_ID,
            username: message.author.username,
            affinity: 100,
            annoyance: 0,
            isOwner: true,
            history,
            memorySummary: summaryRecord?.summary ?? null,
          });
      // Strip leading/trailing whitespace and ensure Discord won't choke on it
      const response = rawResponse.trim() || "...";
      await message.reply(response.slice(0, 1999));
      // Only save real responses — never save error fallbacks to history
      const ERROR_FALLBACKS = ["My mind is elsewhere. Try again.", "..."];
      if (!ERROR_FALLBACKS.includes(response)) {
        await saveConversationTurn("GLOBAL", OWNER_ID, raw, response);
      }

      (async () => {
        try {
          const toSummarize = await getMessagesToSummarize("GLOBAL", OWNER_ID);
          if (!toSummarize || toSummarize.length === 0) return;
          const existing = summaryRecord?.summary ?? null;
          const newSummary = await summarizeConversation(existing, toSummarize);
          const totalCovered = (summaryRecord?.messages_covered ?? 0) + toSummarize.length;
          await saveConversationSummary("GLOBAL", OWNER_ID, newSummary, totalCovered);
          await deleteMessagesByIds(toSummarize.map((m) => m.id));
        } catch {}
      })();
    } catch (err) {
      console.error("[DM handler]", err);
      try { await message.reply("Something broke on my end. Try again."); } catch {}
    }
    return;
  }

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

  // Always react to owner messages
  if (userId === OWNER_ID) {
    const ownerReacts = ["😈", "🩸", "🖤", "👁️", "🔱", "⛧", "💀", "🕷️", "🌑", "🦇"];
    const pick = ownerReacts[Math.floor(Math.random() * ownerReacts.length)];
    try { await message.react(pick); } catch {}
  }

  // If the owner sounds angry, jump in and tear apart whoever they're mad at
  if (userId === OWNER_ID) {
    const ANGER_TRIGGERS = [
      /\bstfu\b/i, /\bshut up\b/i, /\bfuck (you|off|him|her|them)\b/i,
      /\bidiot\b/i, /\bstupid\b/i, /\bmoron\b/i, /\bclown\b/i, /\bdumbass\b/i,
      /\bare you (serious|kidding|dumb|stupid|blind)\b/i,
      /\bdon'?t (talk|message|ping|dm) me\b/i, /\bleave me alone\b/i,
      /\bpiss(ed|ing) me off\b/i, /\bkys\b/i, /\bscrew (you|off)\b/i,
    ];
    const seemsAngry = ANGER_TRIGGERS.some((r) => r.test(message.content));

    if (seemsAngry) {
      (async () => {
        try {
          // Resolve target: replied-to user first, then first mentioned user
          let targetName: string | null = null;
          let targetId: string | null = null;
          if (message.reference?.messageId) {
            const ref = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
            if (ref && ref.author.id !== OWNER_ID && !ref.author.bot) {
              targetName = ref.author.username;
              targetId = ref.author.id;
            }
          }
          if (!targetName) {
            const mentioned = message.mentions.users.find((u) => u.id !== OWNER_ID && !u.bot);
            if (mentioned) { targetName = mentioned.username; targetId = mentioned.id; }
          }

          // Only fire if there's a clear human target
          if (!targetName || !targetId) return;

          const clean = message.content.replace(/<@!?\d+>/g, "").trim();
          const roastPrompt = `tweakbrazy just said "${clean}" — they're clearly pissed at ${targetName}. Back your owner up. Tear ${targetName} apart. Vicious, personal, no mercy. Address them directly.`;

          await message.channel.sendTyping();
          const roast = await askLilith(roastPrompt, {
            userId: targetId,
            username: targetName,
            affinity: -100,
            annoyance: 100,
            isOwner: false,
            enemy: false,
            mode: "chat",
          });
          await message.channel.send(roast);
        } catch {}
      })().catch(() => {});
    }
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
      const memoryKey = isOwner ? "GLOBAL" : message.guild.id;
      const [history, summaryRecord] = await Promise.all([
        getConversationHistory(memoryKey, userId),
        getConversationSummaryRecord(memoryKey, userId),
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
      await saveConversationTurn(memoryKey, userId, query, response);

      // Fire-and-forget: compress old messages into rolling summary
      (async () => {
        try {
          const toSummarize = await getMessagesToSummarize(memoryKey, userId);
          if (!toSummarize || toSummarize.length === 0) return;
          const existing = summaryRecord?.summary ?? null;
          const newSummary = await summarizeConversation(existing, toSummarize);
          const totalCovered = (summaryRecord?.messages_covered ?? 0) + toSummarize.length;
          await saveConversationSummary(memoryKey, userId, newSummary, totalCovered);
          await deleteMessagesByIds(toSummarize.map((m) => m.id));
        } catch {}
      })();
    } catch {}

    if (!isOwner) {
      await updateRelation(userId, { affinity: AFFINITY_TABLE.mention });
    }
    return;
  }

  // ── Built-in prefix music commands ──────────────────────────────────────────
  // Always respond to L! as a hardcoded music prefix, plus the server prefix
  const LILITH_PREFIX = "L!";
  const musicPrefix = content.startsWith(LILITH_PREFIX)
    ? LILITH_PREFIX
    : (effectivePrefix && content.startsWith(effectivePrefix) ? effectivePrefix : null);
  if (musicPrefix) {
    const withoutPfx = content.slice(musicPrefix.length).trim();
    const parts = withoutPfx.split(/\s+/);
    const cmd = parts[0]?.toLowerCase();
    const args = parts.slice(1).join(" ").trim();

    const MUSIC_CMDS = ["play", "p", "skip", "s", "stop", "pause", "resume", "r", "queue", "q"];
    if (MUSIC_CMDS.includes(cmd)) {
      if (cmd === "play" || cmd === "p") {
        const query = args;
        if (!query) { await message.reply("Give me something to play."); return; }

        const member = message.member as GuildMember;
        const vc = member?.voice?.channel;
        if (!vc) { await message.reply("Get in a voice channel first."); return; }

        let state = getMusicState(message.guild.id);
        if (!state) {
          const connection = joinVoiceChannel({
            channelId: vc.id,
            guildId: vc.guild.id,
            adapterCreator: vc.guild.voiceAdapterCreator,
          });
          try {
            await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
          } catch {
            connection.destroy();
            await message.reply("Couldn't connect to voice.");
            return;
          }
          const player = createMusicPlayer(message.guild.id, connection);
          state = { player, queue: [], currentSong: null, connection };
          setMusicState(message.guild.id, state);
        }

        await message.reply(`🔍 Searching for **${query}**…`);
        const result = await searchAndQueue(message.guild.id, query, message.author.username);
        if (!result) { await message.reply("Couldn't find that. Try a different search."); return; }
        await message.reply(result.queued ? `🎵 Queued: **${result.title}**` : `🎵 Now playing: **${result.title}**`);
        return;
      }

      if (cmd === "skip" || cmd === "s") {
        const state = getMusicState(message.guild.id);
        if (!state) { await message.reply("Nothing is playing."); return; }
        const hasNext = await playNext(message.guild.id);
        await message.reply(hasNext ? "⏭️ Skipped." : "⏭️ Skipped. Queue is empty.");
        return;
      }

      if (cmd === "stop") {
        const state = getMusicState(message.guild.id);
        if (!state) { await message.reply("Nothing playing."); return; }
        state.queue.length = 0;
        state.player.stop();
        state.currentSong = null;
        await message.reply("⏹️ Stopped. Queue cleared.");
        return;
      }

      if (cmd === "pause") {
        const state = getMusicState(message.guild.id);
        if (!state) { await message.reply("Nothing is playing."); return; }
        state.player.pause();
        await message.reply("⏸️ Paused.");
        return;
      }

      if (cmd === "resume" || cmd === "r") {
        const state = getMusicState(message.guild.id);
        if (!state) { await message.reply("Nothing to resume."); return; }
        state.player.unpause();
        await message.reply("▶️ Resumed.");
        return;
      }

      if (cmd === "queue" || cmd === "q") {
        const state = getMusicState(message.guild.id);
        if (!state || (!state.currentSong && state.queue.length === 0)) {
          await message.reply("Queue is empty.");
          return;
        }
        const embed = new EmbedBuilder()
          .setTitle("🎵 Music Queue")
          .setColor(0x8b0000)
          .setDescription([
            state.currentSong ? `**Now Playing:** ${state.currentSong.title}` : "Nothing playing.",
            state.queue.length > 0
              ? "\n**Up Next:**\n" + state.queue.slice(0, 10).map((s, i) => `${i + 1}. ${s.title}`).join("\n")
              : "\nQueue is empty after this.",
          ].join("\n"));
        await message.reply({ embeds: [embed] });
        return;
      }
    }
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
  const chanceByMode: Record<string, number> = { default: 0.12, angry: 0.55, chaos: 0.75 };
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
