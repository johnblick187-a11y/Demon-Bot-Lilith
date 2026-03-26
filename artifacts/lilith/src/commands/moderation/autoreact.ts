import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";
import { addAutoreact, removeAutoreact } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("autoreact")
  .setDescription("Manage auto-reaction triggers")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add an auto-reaction trigger")
      .addStringOption((opt) => opt.setName("trigger").setDescription("Trigger word/phrase").setRequired(true))
      .addStringOption((opt) => opt.setName("emoji").setDescription("Emoji to react with").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove an auto-reaction trigger")
      .addStringOption((opt) => opt.setName("trigger").setDescription("Trigger to remove").setRequired(true))
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;

  const sub = (interaction.options as any).getSubcommand();

  if (sub === "add") {
    const trigger = (interaction.options as any).getString("trigger", true);
    const emoji = (interaction.options as any).getString("emoji", true);
    await addAutoreact(interaction.guildId, trigger.toLowerCase(), emoji);
    await interaction.reply(`✅ Auto-react set: when someone says "${trigger}", I'll react with ${emoji}.`);
  }

  if (sub === "remove") {
    const trigger = (interaction.options as any).getString("trigger", true);
    const deleted = await removeAutoreact(interaction.guildId, trigger);
    await interaction.reply(
      deleted
        ? `✅ Removed auto-react for "${trigger}".`
        : `❌ No auto-react found for "${trigger}".`
    );
  }
}
