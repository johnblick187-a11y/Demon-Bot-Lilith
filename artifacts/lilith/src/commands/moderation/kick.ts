import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("kick")
  .setDescription("Kick one or more users from the server")
  .addUserOption((opt) => opt.setName("user1").setDescription("User to kick").setRequired(true))
  .addUserOption((opt) => opt.setName("user2").setDescription("Second user").setRequired(false))
  .addUserOption((opt) => opt.setName("user3").setDescription("Third user").setRequired(false))
  .addUserOption((opt) => opt.setName("user4").setDescription("Fourth user").setRequired(false))
  .addUserOption((opt) => opt.setName("user5").setDescription("Fifth user").setRequired(false))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;

  const isOwner = interaction.user.id === OWNER_ID;
  const reason = (interaction.options as any).getString("reason") ?? "No reason given.";

  const allTargets = [1, 2, 3, 4, 5]
    .map((n) => (interaction.options as any).getUser(`user${n}`))
    .filter(Boolean);

  const targets = isOwner ? allTargets : allTargets.slice(0, 1);

  await interaction.deferReply();

  const kicked: string[] = [];
  const failed: string[] = [];

  for (const target of targets) {
    const member = interaction.guild.members.cache.get(target.id);
    if (!member) { failed.push(`**${target.username}** (not in server)`); continue; }
    if (!member.kickable) { failed.push(`**${target.username}** (can't kick)`); continue; }
    try {
      await member.kick(reason);
      kicked.push(`**${target.username}**`);
    } catch {
      failed.push(`**${target.username}** (failed)`);
    }
  }

  const lines: string[] = [];
  if (kicked.length) lines.push(`👢 Kicked: ${kicked.join(", ")} — Reason: *${reason}*`);
  if (failed.length) lines.push(`❌ Couldn't kick: ${failed.join(", ")}`);

  await interaction.editReply(lines.join("\n"));
}
