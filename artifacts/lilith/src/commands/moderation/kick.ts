import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick a user from the server")
  .addUserOption((opt) => opt.setName("user").setDescription("User to kick").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const reason = (interaction.options as any).getString("reason") ?? "No reason given.";
  const member = interaction.guild?.members.cache.get(target.id);

  if (!member) return interaction.reply({ content: "User not found.", ephemeral: true });
  if (!member.kickable) return interaction.reply({ content: "Can't kick that user.", ephemeral: true });

  await member.kick(reason);
  await interaction.reply(`👢 **${target.username}** has been kicked. Reason: *${reason}*.`);
}
