import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";
import { addAutoreact } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("autoreact")
  .setDescription("Add an auto-reaction trigger")
  .addStringOption((opt) => opt.setName("trigger").setDescription("Trigger word/phrase").setRequired(true))
  .addStringOption((opt) => opt.setName("emoji").setDescription("Emoji to react with").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;
  const trigger = (interaction.options as any).getString("trigger", true);
  const emoji = (interaction.options as any).getString("emoji", true);

  await addAutoreact(interaction.guildId, trigger.toLowerCase(), emoji);
  await interaction.reply(`✅ Auto-react set: when someone says "${trigger}", I'll react with ${emoji}.`);
}
