import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  Collection,
  Message,
} from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";

const CUSTOM_EMOJI_RE = /<a?:(\w+):(\d+)>/g;

function extractEmojis(content: string): Array<{ name: string; id: string; animated: boolean }> {
  const found: Array<{ name: string; id: string; animated: boolean }> = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  const re = /<(a?):(\w+):(\d+)>/g;
  while ((match = re.exec(content)) !== null) {
    const animated = match[1] === "a";
    const name = match[2];
    const id = match[3];
    if (!seen.has(id)) {
      seen.add(id);
      found.push({ name, id, animated });
    }
  }
  return found;
}

export const data = new SlashCommandBuilder()
  .setName("stealemoji")
  .setDescription("Steal custom emoji(s) and add them to a server you manage — scans the entire channel history")
  .addStringOption((opt) =>
    opt
      .setName("server")
      .setDescription("Server ID or name to add the emoji(s) to")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("name")
      .setDescription("Specific emoji name to find (omit to grab all custom emojis in this channel)")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(0n);

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "No.", flags: 64 });
  }

  await interaction.deferReply({ ephemeral: true });

  const targetName = ((interaction.options as any).getString("name") as string | null)?.toLowerCase();
  const serverQuery = (interaction.options as any).getString("server", true) as string;

  const targetGuild =
    interaction.client.guilds.cache.get(serverQuery) ??
    interaction.client.guilds.cache.find(
      (g) => g.name.toLowerCase() === serverQuery.toLowerCase()
    );

  if (!targetGuild) {
    return interaction.editReply(
      `I'm not in a server matching \`${serverQuery}\`. Provide a server name or ID that I'm actually in.`
    );
  }

  const member = await targetGuild.members.fetch(interaction.user.id).catch(() => null);
  if (!member || !member.permissions.has(PermissionFlagsBits.ManageGuildExpressions)) {
    return interaction.editReply(`You don't have Manage Expressions permission in **${targetGuild.name}**.`);
  }

  const channel = interaction.channel as TextChannel;
  if (!channel || typeof channel.messages?.fetch !== "function") {
    return interaction.editReply("Can't read messages in this channel.");
  }

  const collected: Array<{ name: string; id: string; animated: boolean }> = [];
  const seen = new Set<string>();

  let before: string | undefined;
  let fetched = 0;
  let batchCount = 0;

  await interaction.editReply("🔍 Scanning channel history… this may take a while for large channels.");

  while (true) {
    const batch: Collection<string, Message> = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });
    if (batch.size === 0) break;

    for (const msg of batch.values()) {
      const emojis = extractEmojis(msg.content);
      for (const e of emojis) {
        if (seen.has(e.id)) continue;
        if (targetName && e.name.toLowerCase() !== targetName) continue;
        seen.add(e.id);
        collected.push(e);
      }
      for (const reaction of msg.reactions.cache.values()) {
        if (reaction.emoji.id) {
          const e = {
            name: reaction.emoji.name ?? "emoji",
            id: reaction.emoji.id,
            animated: reaction.emoji.animated ?? false,
          };
          if (!seen.has(e.id)) {
            if (!targetName || e.name.toLowerCase() === targetName) {
              seen.add(e.id);
              collected.push(e);
            }
          }
        }
      }
    }

    fetched += batch.size;
    batchCount++;
    before = batch.last()?.id;

    if (batchCount % 10 === 0) {
      await interaction.editReply(
        `🔍 Scanned ${fetched.toLocaleString()} messages… found ${collected.length} unique emoji(s) so far.`
      ).catch(() => {});
    }

    if (batch.size < 100) break;
  }

  if (collected.length === 0) {
    return interaction.editReply(
      targetName
        ? `No custom emoji named \`${targetName}\` found across ${fetched.toLocaleString()} messages.`
        : `No custom emojis found across ${fetched.toLocaleString()} messages.`
    );
  }

  const guildEmojiSlots =
    targetGuild.premiumTier === 0 ? 50
    : targetGuild.premiumTier === 1 ? 100
    : targetGuild.premiumTier === 2 ? 150
    : 250;
  const existingCount = targetGuild.emojis.cache.size;
  const available = guildEmojiSlots - existingCount;

  const toAdd = collected.slice(0, available);
  if (toAdd.length === 0) {
    return interaction.editReply(
      `Found ${collected.length} emoji(s) across ${fetched.toLocaleString()} messages, but **${targetGuild.name}** has no slots available (${existingCount}/${guildEmojiSlots}).`
    );
  }

  await interaction.editReply(
    `✅ Scan complete — ${fetched.toLocaleString()} messages, ${collected.length} unique emoji(s) found. Adding ${toAdd.length} to **${targetGuild.name}**…`
  );

  const results: string[] = [];
  for (const emoji of toAdd) {
    const url = `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "png"}?size=128`;
    try {
      const created = await targetGuild.emojis.create({ attachment: url, name: emoji.name });
      results.push(`✅ \`:${created.name}:\` added`);
    } catch (err: any) {
      results.push(`❌ \`:${emoji.name}:\` failed — ${err?.message ?? "unknown error"}`);
    }
  }

  const skipped = collected.length - toAdd.length;
  const summary = [
    `**Emoji theft results for ${targetGuild.name}** (scanned ${fetched.toLocaleString()} messages):`,
    ...results,
    skipped > 0 ? `\n*${skipped} emoji(s) skipped — not enough slots.*` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const chunks = summary.match(/.{1,1900}/gs) ?? [summary];
  await interaction.editReply(chunks[0]);
  for (let i = 1; i < chunks.length; i++) {
    await interaction.followUp({ content: chunks[i], ephemeral: true });
  }
}
