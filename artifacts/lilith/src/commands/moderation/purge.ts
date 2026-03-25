import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("purge")
  .setDescription("Delete messages in bulk")
  .addIntegerOption((opt) =>
    opt.setName("count").setDescription("Number of messages (1-100)").setRequired(true).setMinValue(1).setMaxValue(100)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages);

export async function execute(interaction: CommandInteraction) {
  const count = (interaction.options as any).getInteger("count", true);
  const channel = interaction.channel as TextChannel;

  await interaction.deferReply({ ephemeral: true });

  const deleted = await channel.bulkDelete(count, true);
  await interaction.editReply(`🗑️ Deleted ${deleted.size} messages. Clean enough.`);
}
