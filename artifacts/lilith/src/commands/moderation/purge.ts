import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  Collection,
  Message,
} from "discord.js";

const FOURTEEN_DAYS = 14 * 24 * 60 * 60 * 1000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Delete every message in this channel — no age limit, no count limit")
  .addIntegerOption((opt) =>
    opt
      .setName("count")
      .setDescription("Number of messages to delete (leave blank to wipe the entire channel)")
      .setRequired(false)
      .setMinValue(1)
  )
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("Only delete messages from this user")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: CommandInteraction) {
  const channel = interaction.channel as TextChannel;
  if (!channel || typeof channel.messages?.fetch !== "function") {
    return interaction.reply({ content: "Can't purge this channel.", ephemeral: true });
  }

  const limit = (interaction.options as any).getInteger("count") as number | null;
  const targetUser = (interaction.options as any).getUser("user") as { id: string; username: string } | null;

  await interaction.deferReply({ ephemeral: true });

  const label = limit ? `${limit.toLocaleString()} messages` : "all messages";
  const userLabel = targetUser ? ` from **${targetUser.username}**` : "";
  await interaction.editReply(`🔥 Purging ${label}${userLabel}… stand back.`);

  let totalDeleted = 0;
  let before: string | undefined;
  let done = false;

  while (!done) {
    const remaining = limit ? limit - totalDeleted : Infinity;
    if (remaining <= 0) break;

    const fetchLimit = Math.min(100, remaining === Infinity ? 100 : remaining);

    const batch: Collection<string, Message> = await channel.messages.fetch({
      limit: fetchLimit,
      ...(before ? { before } : {}),
    });

    if (batch.size === 0) break;

    const filtered = targetUser
      ? batch.filter((m) => m.author.id === targetUser.id)
      : batch;

    if (filtered.size === 0) {
      before = batch.last()?.id;
      if (batch.size < fetchLimit) break;
      continue;
    }

    const now = Date.now();
    const recent = filtered.filter((m) => now - m.createdTimestamp < FOURTEEN_DAYS);
    const old = filtered.filter((m) => now - m.createdTimestamp >= FOURTEEN_DAYS);

    if (recent.size >= 2) {
      try {
        const deleted = await channel.bulkDelete(recent, true);
        totalDeleted += deleted.size;
      } catch {}
    } else if (recent.size === 1) {
      try {
        await recent.first()!.delete();
        totalDeleted += 1;
      } catch {}
    }

    for (const msg of old.values()) {
      try {
        await msg.delete();
        totalDeleted += 1;
        await sleep(300);
      } catch {}
    }

    before = batch.last()?.id;

    if (totalDeleted % 500 === 0 && totalDeleted > 0) {
      await interaction.editReply(`🔥 ${totalDeleted.toLocaleString()} messages deleted so far…`).catch(() => {});
    }

    if (batch.size < fetchLimit) break;
  }

  await interaction.editReply(
    `✅ Done. **${totalDeleted.toLocaleString()}** message${totalDeleted !== 1 ? "s" : ""} deleted${userLabel}.`
  ).catch(() => {});
}
