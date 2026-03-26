import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("ban")
  .setDescription("Ban one or more users from the server")
  .addUserOption((opt) => opt.setName("user1").setDescription("User to ban").setRequired(true))
  .addUserOption((opt) => opt.setName("user2").setDescription("Second user").setRequired(false))
  .addUserOption((opt) => opt.setName("user3").setDescription("Third user").setRequired(false))
  .addUserOption((opt) => opt.setName("user4").setDescription("Fourth user").setRequired(false))
  .addUserOption((opt) => opt.setName("user5").setDescription("Fifth user").setRequired(false))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;

  const isOwner = interaction.user.id === OWNER_ID;
  const reason = (interaction.options as any).getString("reason") ?? "No reason given.";

  const allTargets = [1, 2, 3, 4, 5]
    .map((n) => (interaction.options as any).getUser(`user${n}`))
    .filter(Boolean);

  const targets = isOwner ? allTargets : allTargets.slice(0, 1);

  await interaction.deferReply();

  const banned: string[] = [];
  const failed: string[] = [];

  for (const target of targets) {
    const member = interaction.guild.members.cache.get(target.id);
    if (member && !member.bannable) {
      failed.push(`**${target.username}** (can't ban)`);
      continue;
    }
    try {
      await interaction.guild.members.ban(target.id, { reason });
      banned.push(`**${target.username}**`);
    } catch {
      failed.push(`**${target.username}** (failed)`);
    }
  }

  const lines: string[] = [];
  if (banned.length) lines.push(`🔨 Banned: ${banned.join(", ")} — Reason: *${reason}*`);
  if (failed.length) lines.push(`❌ Couldn't ban: ${failed.join(", ")}`);

  await interaction.editReply(lines.join("\n"));
}
