import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("timeout")
  .setDescription("Timeout a user")
  .addUserOption((opt) => opt.setName("user").setDescription("User to timeout").setRequired(true))
  .addIntegerOption((opt) =>
    opt.setName("duration").setDescription("Duration in minutes").setRequired(true).setMinValue(1).setMaxValue(40320)
  )
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const minutes = (interaction.options as any).getInteger("duration", true);
  const reason = (interaction.options as any).getString("reason") ?? "No reason given.";
  const member = interaction.guild?.members.cache.get(target.id);

  if (!member) return interaction.reply({ content: "User not found.", flags: 64 });

  const ms = minutes * 60 * 1000;
  await member.timeout(ms, reason);
  await interaction.reply(
    `🔇 **${target.username}** timed out for **${minutes} minute(s)**. Reason: *${reason}*. Silence.`
  );
}
