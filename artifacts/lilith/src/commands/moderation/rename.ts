import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("rename")
  .setDescription("Rename a user's server nickname")
  .addUserOption((opt) => opt.setName("user").setDescription("User to rename").setRequired(true))
  .addStringOption((opt) => opt.setName("name").setDescription("New nickname").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames);

export async function execute(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const newName = (interaction.options as any).getString("name", true);
  const member = interaction.guild?.members.cache.get(target.id);

  if (!member) return interaction.reply({ content: "User not found.", ephemeral: true });

  const old = member.displayName;
  await member.setNickname(newName);
  await interaction.reply(`✏️ Renamed **${old}** → **${newName}**.`);
}
