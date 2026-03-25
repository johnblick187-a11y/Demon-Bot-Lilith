import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";
import { addAutoreply } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("autoreply")
  .setDescription("Add an auto-reply trigger")
  .addStringOption((opt) => opt.setName("trigger").setDescription("Trigger word/phrase").setRequired(true))
  .addStringOption((opt) => opt.setName("reply").setDescription("Reply text").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;
  const trigger = (interaction.options as any).getString("trigger", true);
  const reply = (interaction.options as any).getString("reply", true);

  await addAutoreply(interaction.guildId, trigger.toLowerCase(), reply);
  await interaction.reply(`✅ Auto-reply set: when someone says "${trigger}", I'll reply with "${reply}".`);
}
