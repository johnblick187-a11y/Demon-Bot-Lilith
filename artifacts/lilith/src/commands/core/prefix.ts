import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  getGuildPrefix,
  getGuildUserPrefix,
  setGuildUserPrefix,
} from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("changeprefix")
  .setDescription("Change the command prefix for yourself or another user in this server")
  .addUserOption((opt) =>
    opt
      .setName("user")
      .setDescription("Who to change the prefix for (defaults to you if not specified)")
      .setRequired(false)
  )
  .addStringOption((opt) =>
    opt
      .setName("new_prefix")
      .setDescription("The new prefix to assign (leave blank to check current prefix)")
      .setRequired(false)
      .setMinLength(1)
      .setMaxLength(5)
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "This command is server-only.", flags: 64 });
  }

  const targetUser = (interaction.options as any).getUser("user") as {
    id: string;
    username: string;
  } | null ?? interaction.user;

  const newPrefix = (interaction.options as any).getString("new_prefix") as string | null;

  if (newPrefix && /\s/.test(newPrefix)) {
    return interaction.reply({ content: "Prefix cannot contain spaces.", flags: 64 });
  }

  const isSelf = targetUser.id === interaction.user.id;
  if (!isSelf) {
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    if (!member?.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: "You need Manage Server permission to change someone else's prefix.",
        flags: 64,
      });
    }
  }

  const displayName = (targetUser as any).username ?? (targetUser as any).tag ?? "Unknown";

  if (newPrefix) {
    await setGuildUserPrefix(interaction.guildId, targetUser.id, newPrefix);

    const who = isSelf ? "Your" : `**${displayName}**'s`;
    return interaction.reply(
      `✅ ${who} prefix in this server is now \`${newPrefix}\`. ` +
      `Custom commands are triggered with \`${newPrefix}<command>\`.`
    );
  } else {
    const personal = await getGuildUserPrefix(interaction.guildId, targetUser.id);
    const guildDefault = await getGuildPrefix(interaction.guildId);
    const effective = personal ?? guildDefault;
    const source = personal ? "personal" : "server default";

    const who = isSelf ? "Your" : `**${displayName}**'s`;
    return interaction.reply({
      content: `${who} current prefix is \`${effective}\` *(${source})*.`,
      flags: 64,
    });
  }
}
