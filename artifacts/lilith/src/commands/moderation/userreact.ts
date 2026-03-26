import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { pool } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("userreact")
  .setDescription("Auto-react to every message a specific user sends")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add an auto-react for a user")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Target user").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("emoji").setDescription("Emoji to react with").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove an auto-react for a user")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Target user").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("emoji").setDescription("Specific emoji to remove (leave blank to remove all)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List all user auto-reacts in this server")
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;
  const sub = (interaction.options as any).getSubcommand();

  if (sub === "add") {
    const user  = (interaction.options as any).getUser("user", true);
    const emoji = (interaction.options as any).getString("emoji", true) as string;
    await pool.query(
      `INSERT INTO user_autoreacts (guild_id, user_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [interaction.guildId, user.id, emoji]
    );
    await interaction.reply(`✅ I'll react with ${emoji} to every message **${user.username}** sends.`);
  }

  if (sub === "remove") {
    const user  = (interaction.options as any).getUser("user", true);
    const emoji = (interaction.options as any).getString("emoji") as string | null;

    if (emoji) {
      const res = await pool.query(
        `DELETE FROM user_autoreacts WHERE guild_id=$1 AND user_id=$2 AND emoji=$3`,
        [interaction.guildId, user.id, emoji]
      );
      await interaction.reply(
        (res.rowCount ?? 0) > 0
          ? `✅ Removed ${emoji} auto-react from **${user.username}**.`
          : `❌ No ${emoji} auto-react found for **${user.username}**.`
      );
    } else {
      const res = await pool.query(
        `DELETE FROM user_autoreacts WHERE guild_id=$1 AND user_id=$2`,
        [interaction.guildId, user.id]
      );
      await interaction.reply(
        (res.rowCount ?? 0) > 0
          ? `✅ Removed all auto-reacts from **${user.username}**.`
          : `❌ No auto-reacts found for **${user.username}**.`
      );
    }
  }

  if (sub === "list") {
    const res = await pool.query(
      `SELECT user_id, emoji FROM user_autoreacts WHERE guild_id=$1 ORDER BY user_id`,
      [interaction.guildId]
    );
    if (res.rows.length === 0) {
      return interaction.reply({ content: "No user auto-reacts set up.", flags: 64 });
    }
    const grouped: Record<string, string[]> = {};
    for (const row of res.rows) {
      if (!grouped[row.user_id]) grouped[row.user_id] = [];
      grouped[row.user_id].push(row.emoji);
    }
    const lines = Object.entries(grouped).map(
      ([uid, emojis]) => `<@${uid}> → ${emojis.join(" ")}`
    );
    await interaction.reply({ content: `**User Auto-Reacts:**\n${lines.join("\n")}`, flags: 64 });
  }
}
