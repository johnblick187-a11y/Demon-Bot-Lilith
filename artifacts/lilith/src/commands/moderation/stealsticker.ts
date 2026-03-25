import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  Collection,
  Message,
  StickerFormatType,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("stealsticker")
  .setDescription("Steal sticker(s) from this channel and add them to a server you manage")
  .addStringOption((opt) =>
    opt
      .setName("server")
      .setDescription("Server ID or name to add the sticker(s) to")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("name")
      .setDescription("Sticker name to target (omit to scan last 2000 messages)")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions);

export async function execute(interaction: CommandInteraction) {
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
      `I'm not in a server matching \`${serverQuery}\`. Provide a server name or ID that I'm in.`
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

  const collected: Array<{ name: string; id: string; url: string; description: string }> = [];
  const seen = new Set<string>();

  let before: string | undefined;
  let fetched = 0;

  while (fetched < 2000) {
    const batch: Collection<string, Message> = await channel.messages.fetch({
      limit: 100,
      ...(before ? { before } : {}),
    });
    if (batch.size === 0) break;

    for (const msg of batch.values()) {
      for (const sticker of msg.stickers.values()) {
        if (seen.has(sticker.id)) continue;
        if (sticker.guildId === interaction.guildId) continue;
        if (targetName && sticker.name.toLowerCase() !== targetName) continue;
        if (sticker.format === StickerFormatType.Lottie) continue;

        const ext = sticker.format === StickerFormatType.GIF ? "gif" : "png";
        const url = `https://media.discordapp.net/stickers/${sticker.id}.${ext}`;
        seen.add(sticker.id);
        collected.push({
          name: sticker.name,
          id: sticker.id,
          url,
          description: sticker.description ?? sticker.name,
        });
      }
    }

    fetched += batch.size;
    before = batch.last()?.id;
    if (batch.size < 100) break;
  }

  if (collected.length === 0) {
    return interaction.editReply(
      targetName
        ? `No sticker named \`${targetName}\` found in the last ${fetched} messages.`
        : `No stealable stickers found in the last ${fetched} messages. (Lottie/Nitro stickers can't be stolen.)`
    );
  }

  const maxStickers =
    targetGuild.premiumTier === 0 ? 5 : targetGuild.premiumTier === 1 ? 15 : targetGuild.premiumTier === 2 ? 30 : 60;
  const existingCount = targetGuild.stickers.cache.size;
  const available = maxStickers - existingCount;

  const toAdd = collected.slice(0, available);
  if (toAdd.length === 0) {
    return interaction.editReply(`**${targetGuild.name}** has no sticker slots available (${existingCount}/${maxStickers}).`);
  }

  const results: string[] = [];
  for (const sticker of toAdd) {
    try {
      const created = await targetGuild.stickers.create({
        file: sticker.url,
        name: sticker.name,
        tags: sticker.name,
        description: sticker.description,
      });
      results.push(`✅ **${created.name}** added`);
    } catch (err: any) {
      results.push(`❌ **${sticker.name}** failed — ${err?.message ?? "unknown error"}`);
    }
  }

  const skipped = collected.length - toAdd.length;
  const summary = [
    `**Sticker theft results for ${targetGuild.name}:**`,
    ...results,
    skipped > 0 ? `\n*${skipped} sticker(s) skipped — not enough slots.*` : "",
  ]
    .filter(Boolean)
    .join("\n");

  await interaction.editReply(summary);
}
