import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Unban one or more users from the server")
  .addStringOption((opt) => opt.setName("userid1").setDescription("User ID to unban").setRequired(true))
  .addStringOption((opt) => opt.setName("userid2").setDescription("Second user ID").setRequired(false))
  .addStringOption((opt) => opt.setName("userid3").setDescription("Third user ID").setRequired(false))
  .addStringOption((opt) => opt.setName("userid4").setDescription("Fourth user ID").setRequired(false))
  .addStringOption((opt) => opt.setName("userid5").setDescription("Fifth user ID").setRequired(false))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;

  const reason = (interaction.options as any).getString("reason") ?? "No reason given.";

  const ids = [1, 2, 3, 4, 5]
    .map((n) => (interaction.options as any).getString(`userid${n}`)?.trim())
    .filter(Boolean) as string[];

  await interaction.deferReply();

  const unbanned: string[] = [];
  const failed: string[] = [];

  for (const id of ids) {
    try {
      const ban = await interaction.guild.bans.fetch(id);
      await interaction.guild.members.unban(id, reason);
      unbanned.push(`**${ban.user.username}**`);
    } catch {
      failed.push(`\`${id}\` (not banned or invalid ID)`);
    }
  }

  const lines: string[] = [];
  if (unbanned.length) lines.push(`✅ Unbanned: ${unbanned.join(", ")} — Reason: *${reason}*`);
  if (failed.length) lines.push(`❌ Couldn't unban: ${failed.join(", ")}`);

  await interaction.editReply(lines.join("\n"));
}
