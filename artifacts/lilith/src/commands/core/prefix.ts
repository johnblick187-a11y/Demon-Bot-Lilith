import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { setGuildPrefix, getGuildPrefix } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("prefix")
  .setDescription("Change the bot's prefix for this server")
  .addStringOption((opt) =>
    opt
      .setName("new_prefix")
      .setDescription("The new prefix (e.g. !, ?, ., ~, $)")
      .setRequired(true)
      .setMinLength(1)
      .setMaxLength(5)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) {
    return interaction.reply({ content: "This command is server-only.", ephemeral: true });
  }

  const newPrefix = (interaction.options as any).getString("new_prefix", true) as string;

  if (/\s/.test(newPrefix)) {
    return interaction.reply({ content: "Prefix cannot contain spaces.", ephemeral: true });
  }

  const old = await getGuildPrefix(interaction.guildId);
  await setGuildPrefix(interaction.guildId, newPrefix);

  await interaction.reply(
    `✅ Prefix changed from \`${old}\` to \`${newPrefix}\`.\n` +
    `Custom prefix commands are now triggered with \`${newPrefix}<command>\`.`
  );
}
