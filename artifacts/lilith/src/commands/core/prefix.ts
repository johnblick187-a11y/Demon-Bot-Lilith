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
  .setName("editprefix")
  .setDescription("Change or look up the prefix for any individual user or bot")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("The user or bot whose prefix you want to change")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("choose_prefix")
      .setDescription("The new prefix to assign (leave blank to look up their current prefix)")
      .setRequired(false)
      .setMinLength(1)
      .setMaxLength(5)
  );

export async function execute(interaction: CommandInteraction) {
  const targetUser = (interaction.options as any).getUser("user") as {
    id: string;
    username: string;
    bot: boolean;
  };
  const chosenPrefix = (interaction.options as any).getString("choose_prefix") as string | null;

  if (chosenPrefix && /\s/.test(chosenPrefix)) {
    return interaction.reply({ content: "Prefix cannot contain spaces.", ephemeral: true });
  }

  const displayName = targetUser.username;

  if (chosenPrefix) {
    await setUserBotPrefix(interaction.user.id, targetUser.id, chosenPrefix, displayName);

    const isLilith = targetUser.id === interaction.client.user?.id;
    if (isLilith && interaction.guildId) {
      const member = interaction.guild?.members.cache.get(interaction.user.id);
      if (member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await setGuildPrefix(interaction.guildId, chosenPrefix);
        return interaction.reply(
          `✅ Lilith's prefix in this server is now \`${chosenPrefix}\`.\n` +
          `*(Commands created with \`/create custom-command\` keep their original prefix regardless.)*`
        );
      }
    }

    return interaction.reply({
      content:
        `✅ **${displayName}**'s prefix set to \`${chosenPrefix}\` in your personal book.\n` +
        `Look it up anytime with \`/editprefix user:${displayName}\`.`,
      ephemeral: true,
    });
  } else {
    const isLilith = targetUser.id === interaction.client.user?.id;
    if (isLilith && interaction.guildId) {
      const current = await getGuildPrefix(interaction.guildId);
      return interaction.reply({
        content: `Lilith's current prefix in this server is \`${current}\`.`,
        ephemeral: true,
      });
    }

    const saved = await getUserBotPrefix(interaction.user.id, targetUser.id);
    if (!saved) {
      return interaction.reply({
        content:
          `No prefix saved for **${displayName}** yet.\n` +
          `Use \`/editprefix user:${displayName} choose_prefix:[prefix]\` to set one.`,
        ephemeral: true,
      });
    }
    return interaction.reply({
      content: `**${saved.bot_username ?? displayName}**'s prefix is \`${saved.prefix}\`.`,
      ephemeral: true,
    });
  }
}
