import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  setGuildPrefix,
  getGuildPrefix,
  getGuildUserPrefix,
  setGuildUserPrefix,
} from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("changeprefix")
  .setDescription("Change the command prefix for a specific user in this server")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("The user whose prefix you want to change")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("new_prefix")
      .setDescription("Their new prefix — leave blank to check what prefix they currently use")
      .setRequired(false)
      .setMinLength(1)
      .setMaxLength(5)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "This command is server-only.", ephemeral: true });
  }

  const targetUser = (interaction.options as any).getUser("user") as {
    id: string;
    username: string;
    bot: boolean;
  };
  const newPrefix = (interaction.options as any).getString("new_prefix") as string | null;

  if (newPrefix && /\s/.test(newPrefix)) {
    return interaction.reply({ content: "Prefix cannot contain spaces.", ephemeral: true });
  }

  const displayName = targetUser.username;

  if (newPrefix) {
    await setGuildUserPrefix(interaction.guildId, targetUser.id, newPrefix);

    const guildDefault = await getGuildPrefix(interaction.guildId);
    const note = newPrefix === guildDefault
      ? ` *(same as the server default — their personal prefix is now cleared to the default)*`
      : ``;

    return interaction.reply(
      `✅ **${displayName}**'s prefix in this server is now \`${newPrefix}\`.\n` +
      `They'll trigger custom commands with \`${newPrefix}<command>\`.${note}`
    );
  } else {
    const personal = await getGuildUserPrefix(interaction.guildId, targetUser.id);
    const guildDefault = await getGuildPrefix(interaction.guildId);
    const effective = personal ?? guildDefault;
    const source = personal ? "personal prefix" : "server default";

    return interaction.reply({
      content: `**${displayName}** uses prefix \`${effective}\` in this server *(${source})*.`,
      ephemeral: true,
    });
  }
}
