import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, ChannelType } from "discord.js";
import { pool } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("setlogchannel")
  .setDescription("Set or remove the server log channel")
  .addSubcommand((sub) =>
    sub
      .setName("set")
      .setDescription("Set the channel where Lilith posts server logs")
      .addChannelOption((opt) =>
        opt
          .setName("channel")
          .setDescription("The channel to log to")
          .addChannelTypes(ChannelType.GuildText)
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("remove").setDescription("Disable server logging")
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;

  const sub = (interaction.options as any).getSubcommand();

  if (sub === "set") {
    const channel = (interaction.options as any).getChannel("channel", true);
    await pool.query(
      `INSERT INTO log_channels (guild_id, channel_id) VALUES ($1, $2)
       ON CONFLICT (guild_id) DO UPDATE SET channel_id=$2`,
      [interaction.guildId, channel.id]
    );
    await interaction.reply(`✅ Server logs will now be sent to <#${channel.id}>.`);
  }

  if (sub === "remove") {
    await pool.query(`DELETE FROM log_channels WHERE guild_id=$1`, [interaction.guildId]);
    await interaction.reply("✅ Server logging disabled.");
  }
}
