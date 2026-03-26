import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";
import { addAutoreply, removeAutoreply } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("autoreply")
  .setDescription("Manage auto-reply triggers")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Add an auto-reply trigger")
      .addStringOption((opt) => opt.setName("trigger").setDescription("Trigger word/phrase").setRequired(true))
      .addStringOption((opt) => opt.setName("reply").setDescription("Reply text").setRequired(true))
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove an auto-reply trigger")
      .addStringOption((opt) => opt.setName("trigger").setDescription("Trigger to remove").setRequired(true))
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;

  const sub = (interaction.options as any).getSubcommand();

  if (sub === "add") {
    const trigger = (interaction.options as any).getString("trigger", true);
    const reply = (interaction.options as any).getString("reply", true);
    await addAutoreply(interaction.guildId, trigger.toLowerCase(), reply);
    await interaction.reply(`✅ Auto-reply set: when someone says "${trigger}", I'll reply with "${reply}".`);
  }

  if (sub === "remove") {
    const trigger = (interaction.options as any).getString("trigger", true);
    const deleted = await removeAutoreply(interaction.guildId, trigger);
    await interaction.reply(
      deleted
        ? `✅ Removed auto-reply for "${trigger}".`
        : `❌ No auto-reply found for "${trigger}".`
    );
  }
}
