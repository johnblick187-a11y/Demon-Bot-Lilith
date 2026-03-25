import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  setGuildPrefix,
  getGuildPrefix,
  getUserBotPrefix,
  setUserBotPrefix,
} from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("prefix")
  .setDescription("Set or view a bot prefix — Lilith's server prefix or any individual bot's prefix")
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
      .setDescription("The bot whose prefix you want to set or look up (works anywhere, no permissions needed)")
      .setRequired(false)
  );

export async function execute(interaction: CommandInteraction) {
  const newPrefix = (interaction.options as any).getString("new_prefix") as string | null;
  const targetUser = (interaction.options as any).getUser("user") as {
    id: string;
    username: string;
    bot: boolean;
  } | null;

  if (newPrefix && /\s/.test(newPrefix)) {
    return interaction.reply({ content: "Prefix cannot contain spaces.", ephemeral: true });
  }

  if (targetUser) {
    const displayName = targetUser.username;

    if (newPrefix) {
      await setUserBotPrefix(interaction.user.id, targetUser.id, newPrefix, displayName);
      return interaction.reply({
        content:
          `✅ Saved — **${displayName}**'s prefix is set to \`${newPrefix}\` in your personal prefix book.\n` +
          `Look it up anytime with \`/prefix user:${displayName}\`.`,
        ephemeral: true,
      });
    } else {
      const saved = await getUserBotPrefix(interaction.user.id, targetUser.id);
      if (!saved) {
        return interaction.reply({
          content:
            `No prefix saved for **${displayName}** yet.\n` +
            `Use \`/prefix new_prefix:[prefix] user:${displayName}\` to set one.`,
          ephemeral: true,
        });
      }
      return interaction.reply({
        content: `**${saved.bot_username ?? displayName}** uses prefix \`${saved.prefix}\`.`,
        ephemeral: true,
      });
    }
  } else {
    if (!interaction.guildId) {
      return interaction.reply({
        content: "Setting Lilith's prefix requires a server. Use the `user` option to track any bot's prefix from anywhere.",
        ephemeral: true,
      });
    }

    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const hasPerms = member?.permissions.has(PermissionFlagsBits.ManageGuild) ?? false;

    if (newPrefix) {
      if (!hasPerms) {
        return interaction.reply({
          content: "You need Manage Server permission to change Lilith's prefix.",
          ephemeral: true,
        });
      }
      const old = await getGuildPrefix(interaction.guildId);
      await setGuildPrefix(interaction.guildId, newPrefix);
      return interaction.reply(
        `✅ Lilith's prefix changed from \`${old}\` to \`${newPrefix}\`.\n` +
        `Custom prefix commands are now triggered with \`${newPrefix}<command>\`.\n` +
        `*(Commands created with \`/create custom-command\` keep their original prefix regardless.)*`
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
