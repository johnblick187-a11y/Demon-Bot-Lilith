import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { pool } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("userreply")
  .setDescription("Auto-reply to every message a specific user sends")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add an auto-reply for a user")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Target user").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("reply").setDescription("Message to reply with").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove an auto-reply for a user")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("Target user").setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("reply").setDescription("Specific reply to remove (leave blank to remove all)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("list")
      .setDescription("List all user auto-replies in this server")
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;
  const sub = (interaction.options as any).getSubcommand();

  if (sub === "add") {
    const user  = (interaction.options as any).getUser("user", true);
    const reply = (interaction.options as any).getString("reply", true) as string;
    await pool.query(
      `INSERT INTO user_autoreplies (guild_id, user_id, reply) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [interaction.guildId, user.id, reply]
    );
    await interaction.reply(`✅ I'll reply with "${reply}" to every message **${user.username}** sends.`);
  }

  if (sub === "remove") {
    const user  = (interaction.options as any).getUser("user", true);
    const reply = (interaction.options as any).getString("reply") as string | null;

    if (reply) {
      const res = await pool.query(
        `DELETE FROM user_autoreplies WHERE guild_id=$1 AND user_id=$2 AND reply=$3`,
        [interaction.guildId, user.id, reply]
      );
      await interaction.reply(
        (res.rowCount ?? 0) > 0
          ? `✅ Removed that auto-reply from **${user.username}**.`
          : `❌ No matching auto-reply found for **${user.username}**.`
      );
    } else {
      const res = await pool.query(
        `DELETE FROM user_autoreplies WHERE guild_id=$1 AND user_id=$2`,
        [interaction.guildId, user.id]
      );
      await interaction.reply(
        (res.rowCount ?? 0) > 0
          ? `✅ Removed all auto-replies from **${user.username}**.`
          : `❌ No auto-replies found for **${user.username}**.`
      );
    }
  }

  if (sub === "list") {
    const res = await pool.query(
      `SELECT user_id, reply FROM user_autoreplies WHERE guild_id=$1 ORDER BY user_id`,
      [interaction.guildId]
    );
    if (res.rows.length === 0) {
      return interaction.reply({ content: "No user auto-replies set up.", flags: 64 });
    }
    const grouped: Record<string, string[]> = {};
    for (const row of res.rows) {
      if (!grouped[row.user_id]) grouped[row.user_id] = [];
      grouped[row.user_id].push(`"${row.reply}"`);
    }
    const lines = Object.entries(grouped).map(
      ([uid, replies]) => `<@${uid}> → ${replies.join(", ")}`
    );
    await interaction.reply({ content: `**User Auto-Replies:**\n${lines.join("\n")}`, flags: 64 });
  }
}
