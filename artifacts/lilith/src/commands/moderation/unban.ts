import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Unban a user from the server")
  .addStringOption((opt) =>
    opt.setName("userid").setDescription("User ID to unban").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason").setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;

  const userId = (interaction.options as any).getString("userid", true).trim();
  const reason = (interaction.options as any).getString("reason") ?? "No reason given.";

  let ban;
  try {
    ban = await interaction.guild.bans.fetch(userId);
  } catch {
    return interaction.reply({ content: `❌ No ban found for user ID \`${userId}\`.`, flags: 64 });
  }

  try {
    await interaction.guild.members.unban(userId, reason);
    await interaction.reply(
      `✅ **${ban.user.username}** has been unbanned. Reason: *${reason}*.`
    );
  } catch {
    await interaction.reply({ content: "❌ Failed to unban. Check my permissions.", flags: 64 });
  }
}
