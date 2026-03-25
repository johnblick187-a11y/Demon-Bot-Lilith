import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  setGuildPrefix,
  getGuildPrefix,
  getTrackedBotPrefix,
  setTrackedBotPrefix,
} from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("prefix")
  .setDescription("Set or view a bot prefix — Lilith's server prefix or another bot's tracked prefix")
  .addStringOption((opt) =>
    opt
      .setName("new_prefix")
      .setDescription("The prefix to set (e.g. !, ?, ., ~, $)")
      .setRequired(false)
      .setMinLength(1)
      .setMaxLength(5)
  )
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("Target another bot to set/view their tracked prefix instead of Lilith's")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "This command is server-only.", ephemeral: true });
  }

  const newPrefix = (interaction.options as any).getString("new_prefix") as string | null;
  const targetUser = (interaction.options as any).getUser("user") as { id: string; username: string; bot: boolean } | null;

  if (/\s/.test(newPrefix ?? "")) {
    return interaction.reply({ content: "Prefix cannot contain spaces.", ephemeral: true });
  }

  if (targetUser) {
    const displayName = targetUser.username;

    if (newPrefix) {
      await setTrackedBotPrefix(interaction.guildId, targetUser.id, newPrefix, displayName);
      return interaction.reply(
        `✅ Tracked prefix for **${displayName}** set to \`${newPrefix}\`.\n` +
        `I'll remember that **${displayName}** uses \`${newPrefix}\` as their prefix in this server.`
      );
    } else {
      const tracked = await getTrackedBotPrefix(interaction.guildId, targetUser.id);
      if (!tracked) {
        return interaction.reply({
          content: `No prefix tracked for **${displayName}** yet. Use \`/prefix new_prefix:[prefix] user:${displayName}\` to set one.`,
          ephemeral: true,
        });
      }
      return interaction.reply(
        `**${tracked.bot_username ?? displayName}** uses prefix \`${tracked.prefix}\` in this server.`
      );
    }
  } else {
    if (newPrefix) {
      const old = await getGuildPrefix(interaction.guildId);
      await setGuildPrefix(interaction.guildId, newPrefix);
      return interaction.reply(
        `✅ Lilith's prefix changed from \`${old}\` to \`${newPrefix}\`.\n` +
        `Custom prefix commands are now triggered with \`${newPrefix}<command>\`.\n` +
        `*(Note: commands created with \`/create custom-command\` keep their original prefix regardless.)*`
      );
    } else {
      const current = await getGuildPrefix(interaction.guildId);
      return interaction.reply({
        content: `Lilith's current prefix in this server is \`${current}\`.`,
        ephemeral: true,
      });
    }
  }
}
