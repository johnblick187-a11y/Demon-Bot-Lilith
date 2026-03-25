import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Ban a user from the server")
  .addUserOption((opt) => opt.setName("user").setDescription("User to ban").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const reason = (interaction.options as any).getString("reason") ?? "No reason given.";
  const member = interaction.guild?.members.cache.get(target.id);

  if (!member) return interaction.reply({ content: "User not found in server.", ephemeral: true });
  if (!member.bannable) return interaction.reply({ content: "I can't ban that user.", ephemeral: true });

  await member.ban({ reason });
  await interaction.reply(`🔨 **${target.username}** has been banned. Reason: *${reason}*. Good riddance.`);
}
