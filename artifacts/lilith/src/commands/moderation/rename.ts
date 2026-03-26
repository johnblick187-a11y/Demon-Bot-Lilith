import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("rename")
  .setDescription("Rename a user's server nickname")
  .addUserOption((opt) => opt.setName("user").setDescription("User to rename").setRequired(true))
  .addStringOption((opt) => opt.setName("name").setDescription("New nickname").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  await interaction.deferReply();

  const target = (interaction.options as any).getUser("user", true);
  const newName = (interaction.options as any).getString("name", true);
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);

  if (!member) return interaction.editReply("User not found.");

  const old = member.displayName;
  await member.setNickname(newName);
  await interaction.editReply(`✏️ Renamed **${old}** → **${newName}**.`);
}
