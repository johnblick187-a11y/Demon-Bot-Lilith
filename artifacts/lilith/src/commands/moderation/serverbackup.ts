import {
  SlashCommandBuilder,
  CommandInteraction,
  AttachmentBuilder,
  EmbedBuilder,
} from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { createBackup, applyBackup } from "../../lib/backup.js";
import {
  saveServerBackup,
  listServerBackups,
  getServerBackup,
  deleteServerBackup,
} from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("serverbackup")
  .setDescription("Create, restore, and manage server backups (owner only)")

  .addSubcommand((s) =>
    s.setName("create")
      .setDescription("Snapshot the entire server config")
      .addStringOption((o) =>
        o.setName("name").setDescription("Label for this backup").setRequired(false)
      )
  )

  .addSubcommand((s) =>
    s.setName("list")
      .setDescription("List all stored backups")
  )

  .addSubcommand((s) =>
    s.setName("download")
      .setDescription("Download a backup as a JSON file")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("Backup ID (from /serverbackup list)").setRequired(true)
      )
  )

  .addSubcommand((s) =>
    s.setName("restore")
      .setDescription("Restore a backup — recreates roles and channels")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("Backup ID (from /serverbackup list)").setRequired(true)
      )
  )

  .addSubcommand((s) =>
    s.setName("delete")
      .setDescription("Delete a stored backup")
      .addIntegerOption((o) =>
        o.setName("id").setDescription("Backup ID").setRequired(true)
      )
  )

  .setDefaultMemberPermissions(0n);

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "Owner only.", flags: 64 });
  }
  if (!interaction.guild) return;

  const sub = (interaction.options as any).getSubcommand();
  const opts = interaction.options as any;

  // ── CREATE ──────────────────────────────────────────────────────────────────
  if (sub === "create") {
    await interaction.deferReply({ flags: 64 });

    const label =
      opts.getString("name") ??
      `Backup ${new Date().toISOString().slice(0, 16).replace("T", " ")}`;

    const data = await createBackup(interaction.guild);
    const id = await saveServerBackup(interaction.guild.id, label, data);
    const json = JSON.stringify(data, null, 2);
    const file = new AttachmentBuilder(Buffer.from(json, "utf-8"), {
      name: `${interaction.guild.name.replace(/\s+/g, "_")}_backup_${id}.json`,
    });

    const embed = new EmbedBuilder()
      .setTitle("Backup Created")
      .setColor(0x2ecc71)
      .addFields(
        { name: "ID", value: String(id), inline: true },
        { name: "Name", value: label, inline: true },
        { name: "Roles", value: String(data.roles.length), inline: true },
        { name: "Channels", value: String(data.channels.length), inline: true },
        { name: "Categories", value: String(data.categories.length), inline: true },
        { name: "Emojis", value: String(data.emojis.length), inline: true }
      )
      .setFooter({ text: "JSON file attached — keep it safe." });

    return interaction.editReply({ embeds: [embed], files: [file] });
  }

  // ── LIST ─────────────────────────────────────────────────────────────────────
  if (sub === "list") {
    await interaction.deferReply({ flags: 64 });

    const rows = await listServerBackups(interaction.guild.id);
    if (rows.length === 0) {
      return interaction.editReply("No backups stored yet. Use `/serverbackup create` to make one.");
    }

    const lines = rows.map(
      (r: any) =>
        `\`#${r.id}\` **${r.name}** — <t:${Math.floor(new Date(r.created_at).getTime() / 1000)}:R>`
    );

    const embed = new EmbedBuilder()
      .setTitle("Server Backups")
      .setDescription(lines.join("\n"))
      .setColor(0x3498db)
      .setFooter({ text: `${rows.length} backup(s)` });

    return interaction.editReply({ embeds: [embed] });
  }

  // ── DOWNLOAD ─────────────────────────────────────────────────────────────────
  if (sub === "download") {
    await interaction.deferReply({ flags: 64 });

    const id = opts.getInteger("id", true) as number;
    const row = await getServerBackup(interaction.guild.id, id);
    if (!row) return interaction.editReply("Backup not found.");

    const json = JSON.stringify(row.data, null, 2);
    const file = new AttachmentBuilder(Buffer.from(json, "utf-8"), {
      name: `backup_${id}.json`,
    });

    return interaction.editReply({
      content: `**Backup #${id}** — ${row.name}`,
      files: [file],
    });
  }

  // ── RESTORE ───────────────────────────────────────────────────────────────────
  if (sub === "restore") {
    await interaction.deferReply({ flags: 64 });

    const id = opts.getInteger("id", true) as number;
    const row = await getServerBackup(interaction.guild.id, id);
    if (!row) return interaction.editReply("Backup not found.");

    await interaction.editReply(`⏳ Restoring backup **#${id} — ${row.name}**... this may take a moment.`);

    const log = await applyBackup(interaction.guild, row.data);

    const summary = log.join("\n").slice(0, 3900);
    const embed = new EmbedBuilder()
      .setTitle(`Restore Complete — Backup #${id}`)
      .setDescription(summary)
      .setColor(0xf1c40f);

    return interaction.editReply({ content: "", embeds: [embed] });
  }

  // ── DELETE ───────────────────────────────────────────────────────────────────
  if (sub === "delete") {
    await interaction.deferReply({ flags: 64 });

    const id = opts.getInteger("id", true) as number;
    const deleted = await deleteServerBackup(interaction.guild.id, id);
    if (!deleted) return interaction.editReply("Backup not found.");

    return interaction.editReply(`🗑️ Backup #${id} deleted.`);
  }
}
