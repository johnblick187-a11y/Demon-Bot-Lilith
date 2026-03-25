import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { addWarning, getWarnings } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Warn a user")
  .addUserOption((opt) => opt.setName("user").setDescription("User to warn").setRequired(true))
  .addStringOption((opt) => opt.setName("reason").setDescription("Reason").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

export async function execute(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const reason = (interaction.options as any).getString("reason", true);

  if (!interaction.guildId) return;

  await addWarning(interaction.guildId, target.id, reason);
  const warnings = await getWarnings(interaction.guildId, target.id);

  await interaction.reply(
    `⚠️ **${target.username}** has been warned. Reason: *${reason}*. Total warnings: **${warnings.length}**.`
  );

  try {
    await target.send(`You've been warned in **${interaction.guild?.name}**.\nReason: ${reason}`);
  } catch {}
}
