import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import {
  getAutomodRules,
  getAutomodWords,
  upsertAutomodRule,
  toggleAutomodRule,
  deleteAutomodRule,
  addAutomodWord,
  removeAutomodWord,
} from "../../lib/db.js";

const ACTIONS = ["delete", "warn", "timeout", "kick", "ban"];

export const data = new SlashCommandBuilder()
  .setName("automod")
  .setDescription("Configure Lilith's automod system")

  .addSubcommand((s) => s.setName("list").setDescription("Show all active automod rules"))

  .addSubcommand((s) =>
    s.setName("spam")
      .setDescription("Detect and act on message spam")
      .addIntegerOption((o) => o.setName("max-messages").setDescription("Max messages allowed in window (default 5)").setRequired(false).setMinValue(2))
      .addIntegerOption((o) => o.setName("window-seconds").setDescription("Time window in seconds (default 5)").setRequired(false).setMinValue(1))
      .addStringOption((o) => o.setName("action").setDescription("Action to take (default: timeout)").setRequired(false).addChoices(...ACTIONS.map((a) => ({ name: a, value: a }))))
      .addIntegerOption((o) => o.setName("timeout-minutes").setDescription("Timeout duration in minutes (if action is timeout)").setRequired(false).setMinValue(1))
  )

  .addSubcommand((s) =>
    s.setName("caps")
      .setDescription("Flag messages with excessive caps")
      .addIntegerOption((o) => o.setName("threshold").setDescription("Caps percentage threshold (default 70)").setRequired(false).setMinValue(10).setMaxValue(100))
      .addIntegerOption((o) => o.setName("min-length").setDescription("Min message length to check (default 8)").setRequired(false).setMinValue(1))
      .addStringOption((o) => o.setName("action").setDescription("Action to take (default: delete)").setRequired(false).addChoices(...ACTIONS.map((a) => ({ name: a, value: a }))))
  )

  .addSubcommand((s) =>
    s.setName("links")
      .setDescription("Block unauthorized links")
      .addStringOption((o) => o.setName("action").setDescription("Action to take (default: delete)").setRequired(false).addChoices(...ACTIONS.map((a) => ({ name: a, value: a }))))
      .addStringOption((o) => o.setName("whitelist").setDescription("Comma-separated allowed domains (e.g. youtube.com,imgur.com)").setRequired(false))
  )

  .addSubcommand((s) =>
    s.setName("mentions")
      .setDescription("Detect mention spam")
      .addIntegerOption((o) => o.setName("max-mentions").setDescription("Max @mentions per message (default 5)").setRequired(false).setMinValue(1))
      .addStringOption((o) => o.setName("action").setDescription("Action to take (default: timeout)").setRequired(false).addChoices(...ACTIONS.map((a) => ({ name: a, value: a }))))
      .addIntegerOption((o) => o.setName("timeout-minutes").setDescription("Timeout duration in minutes").setRequired(false).setMinValue(1))
  )

  .addSubcommand((s) =>
    s.setName("addword")
      .setDescription("Add a banned word/phrase")
      .addStringOption((o) => o.setName("word").setDescription("Word or phrase to ban").setRequired(true))
      .addStringOption((o) => o.setName("action").setDescription("Action to take (default: delete)").setRequired(false).addChoices(...ACTIONS.map((a) => ({ name: a, value: a }))))
      .addIntegerOption((o) => o.setName("timeout-minutes").setDescription("Timeout duration in minutes").setRequired(false).setMinValue(1))
  )

  .addSubcommand((s) =>
    s.setName("removeword")
      .setDescription("Remove a banned word/phrase")
      .addStringOption((o) => o.setName("word").setDescription("Word or phrase to remove").setRequired(true))
  )

  .addSubcommand((s) =>
    s.setName("toggle")
      .setDescription("Enable or disable a rule by ID")
      .addIntegerOption((o) => o.setName("id").setDescription("Rule ID (from /automod list)").setRequired(true))
      .addBooleanOption((o) => o.setName("enabled").setDescription("Enable or disable").setRequired(true))
  )

  .addSubcommand((s) =>
    s.setName("remove")
      .setDescription("Remove a rule by ID")
      .addIntegerOption((o) => o.setName("id").setDescription("Rule ID (from /automod list)").setRequired(true))
  )

  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;
  const sub = (interaction.options as any).getSubcommand();
  const opts = interaction.options as any;

  if (sub === "list") {
    const [rules, words] = await Promise.all([
      getAutomodRules(interaction.guildId),
      getAutomodWords(interaction.guildId),
    ]);

    const embed = new EmbedBuilder()
      .setTitle("Automod Rules")
      .setColor(0xe74c3c);

    const ruleLines = rules.map((r) => {
      const status = r.enabled ? "🟢" : "🔴";
      const cfg = Object.entries(r.config).map(([k, v]) => `${k}: ${v}`).join(", ");
      const dur = r.action_duration ? ` (${r.action_duration}m)` : "";
      return `${status} \`#${r.id}\` **${r.type}** → ${r.action}${dur}${cfg ? ` | ${cfg}` : ""}`;
    });

    const wordLines = words.map((w) => {
      const dur = w.action_duration ? ` (${w.action_duration}m)` : "";
      return `• \`${w.word}\` → ${w.action}${dur}`;
    });

    embed.addFields(
      { name: "Rules", value: ruleLines.length ? ruleLines.join("\n") : "None", inline: false },
      { name: "Banned Words", value: wordLines.length ? wordLines.join("\n") : "None", inline: false }
    );

    return interaction.reply({ embeds: [embed], flags: 64 });
  }

  if (sub === "spam") {
    const rule = await upsertAutomodRule(
      interaction.guildId, "spam",
      { maxMessages: opts.getInteger("max-messages") ?? 5, windowSeconds: opts.getInteger("window-seconds") ?? 5 },
      opts.getString("action") ?? "timeout",
      opts.getInteger("timeout-minutes") ?? 5
    );
    return interaction.reply({ content: `✅ Spam rule set (ID \`${rule.id}\`): max ${rule.config.maxMessages} msgs / ${rule.config.windowSeconds}s → **${rule.action}**`, flags: 64 });
  }

  if (sub === "caps") {
    const rule = await upsertAutomodRule(
      interaction.guildId, "caps",
      { threshold: opts.getInteger("threshold") ?? 70, minLength: opts.getInteger("min-length") ?? 8 },
      opts.getString("action") ?? "delete"
    );
    return interaction.reply({ content: `✅ Caps rule set (ID \`${rule.id}\`): ≥${rule.config.threshold}% caps (min ${rule.config.minLength} chars) → **${rule.action}**`, flags: 64 });
  }

  if (sub === "links") {
    const whitelist = (opts.getString("whitelist") as string | null)
      ?.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean) ?? [];
    const rule = await upsertAutomodRule(
      interaction.guildId, "links",
      { whitelist },
      opts.getString("action") ?? "delete"
    );
    return interaction.reply({
      content: `✅ Link filter set (ID \`${rule.id}\`) → **${rule.action}**${whitelist.length ? ` | Whitelist: ${whitelist.join(", ")}` : " | No whitelist (all links blocked)"}`,
      flags: 64,
    });
  }

  if (sub === "mentions") {
    const rule = await upsertAutomodRule(
      interaction.guildId, "mention_spam",
      { maxMentions: opts.getInteger("max-mentions") ?? 5 },
      opts.getString("action") ?? "timeout",
      opts.getInteger("timeout-minutes") ?? 5
    );
    return interaction.reply({ content: `✅ Mention spam rule set (ID \`${rule.id}\`): max ${rule.config.maxMentions} mentions → **${rule.action}**`, flags: 64 });
  }

  if (sub === "addword") {
    const word = opts.getString("word", true) as string;
    await addAutomodWord(interaction.guildId, word, opts.getString("action") ?? "delete", opts.getInteger("timeout-minutes"));
    return interaction.reply({ content: `✅ Added banned word: \`${word.toLowerCase()}\``, flags: 64 });
  }

  if (sub === "removeword") {
    const word = opts.getString("word", true) as string;
    const removed = await removeAutomodWord(interaction.guildId, word);
    return interaction.reply({
      content: removed ? `✅ Removed \`${word.toLowerCase()}\` from banned words.` : `❌ Word not found.`,
      flags: 64,
    });
  }

  if (sub === "toggle") {
    const id = opts.getInteger("id", true) as number;
    const enabled = opts.getBoolean("enabled", true) as boolean;
    const ok = await toggleAutomodRule(interaction.guildId, id, enabled);
    return interaction.reply({
      content: ok ? `✅ Rule \`#${id}\` ${enabled ? "enabled" : "disabled"}.` : `❌ Rule not found.`,
      flags: 64,
    });
  }

  if (sub === "remove") {
    const id = opts.getInteger("id", true) as number;
    const ok = await deleteAutomodRule(interaction.guildId, id);
    return interaction.reply({
      content: ok ? `✅ Rule \`#${id}\` removed.` : `❌ Rule not found.`,
      flags: 64,
    });
  }
}
