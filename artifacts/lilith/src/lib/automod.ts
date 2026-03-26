import { Message, GuildMember, PermissionFlagsBits } from "discord.js";
import { getAutomodRules, getAutomodWords, AutomodRule } from "./db.js";
import { OWNER_ID } from "./constants.js";

// In-memory spam tracker: guildId:userId -> { count, windowStart }
const spamTracker = new Map<string, { count: number; windowStart: number }>();

type AutomodAction = "delete" | "warn" | "timeout" | "kick" | "ban";

async function enforce(
  message: Message,
  reason: string,
  action: AutomodAction,
  durationMinutes?: number | null
): Promise<void> {
  try { await message.delete(); } catch {}

  const member = message.member as GuildMember | null;
  if (!member) return;

  const warning = `⚠️ **${message.author.username}** — ${reason}`;

  switch (action) {
    case "warn":
      try { await message.channel.send(warning); } catch {}
      break;

    case "timeout": {
      const ms = (durationMinutes ?? 5) * 60 * 1000;
      try {
        await member.timeout(ms, reason);
        await message.channel.send(`${warning} — timed out for ${durationMinutes ?? 5} minute(s).`);
      } catch {}
      break;
    }

    case "kick":
      try {
        await member.kick(reason);
        await message.channel.send(`${warning} — kicked.`);
      } catch {}
      break;

    case "ban":
      try {
        await member.ban({ reason });
        await message.channel.send(`${warning} — banned.`);
      } catch {}
      break;

    case "delete":
    default:
      break;
  }
}

export async function runAutomod(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;
  if (message.author.id === OWNER_ID) return;

  const member = message.member;
  if (member?.permissions.has(PermissionFlagsBits.ManageMessages)) return;

  const guildId = message.guild.id;
  const content = message.content;
  const contentLower = content.toLowerCase();

  const [rules, words] = await Promise.all([
    getAutomodRules(guildId),
    getAutomodWords(guildId),
  ]);

  // ── Banned words ────────────────────────────────────────────────────────────
  for (const w of words) {
    if (contentLower.includes(w.word)) {
      await enforce(message, `Banned word: "${w.word}"`, w.action as AutomodAction, w.action_duration);
      return;
    }
  }

  for (const rule of rules.filter((r) => r.enabled)) {
    switch (rule.type) {

      // ── Spam ───────────────────────────────────────────────────────────────
      case "spam": {
        const maxMessages: number = rule.config.maxMessages ?? 5;
        const windowMs: number = (rule.config.windowSeconds ?? 5) * 1000;
        const key = `${guildId}:${message.author.id}`;
        const now = Date.now();
        const tracker = spamTracker.get(key);

        if (!tracker || now - tracker.windowStart > windowMs) {
          spamTracker.set(key, { count: 1, windowStart: now });
        } else {
          tracker.count++;
          if (tracker.count >= maxMessages) {
            spamTracker.delete(key);
            await enforce(message, "Spam detected", rule.action as AutomodAction, rule.action_duration);
            return;
          }
        }
        break;
      }

      // ── Excessive caps ─────────────────────────────────────────────────────
      case "caps": {
        const minLength: number = rule.config.minLength ?? 8;
        const threshold: number = rule.config.threshold ?? 70;
        const letters = content.replace(/[^a-zA-Z]/g, "");
        if (letters.length >= minLength) {
          const capsRatio = (letters.replace(/[^A-Z]/g, "").length / letters.length) * 100;
          if (capsRatio >= threshold) {
            await enforce(message, `Excessive caps (${Math.round(capsRatio)}%)`, rule.action as AutomodAction, rule.action_duration);
            return;
          }
        }
        break;
      }

      // ── Links ──────────────────────────────────────────────────────────────
      case "links": {
        const whitelist: string[] = rule.config.whitelist ?? [];
        const urlRegex = /https?:\/\/[^\s]+/gi;
        const urls = content.match(urlRegex) ?? [];
        const blocked = urls.filter((url) => {
          try {
            const host = new URL(url).hostname.replace(/^www\./, "");
            return !whitelist.some((w) => host === w || host.endsWith("." + w));
          } catch {
            return true;
          }
        });
        if (blocked.length > 0) {
          await enforce(message, "Unauthorized link", rule.action as AutomodAction, rule.action_duration);
          return;
        }
        break;
      }

      // ── Mention spam ───────────────────────────────────────────────────────
      case "mention_spam": {
        const maxMentions: number = rule.config.maxMentions ?? 5;
        const total = message.mentions.users.size + message.mentions.roles.size;
        if (total >= maxMentions) {
          await enforce(message, `Mention spam (${total} mentions)`, rule.action as AutomodAction, rule.action_duration);
          return;
        }
        break;
      }
    }
  }
}
