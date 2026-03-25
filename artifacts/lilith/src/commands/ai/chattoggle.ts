import { SlashCommandBuilder, CommandInteraction, PermissionFlagsBits } from "discord.js";
import { getChatEnabled, setChatEnabled } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("chattoggle")
  .setDescription("Toggle Lilith's random chime-ins on or off for this server.")
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) {
    return interaction.reply({ content: "Server only.", flags: 64 });
  }

  const userId = interaction.user.id;
  const isAdmin = (interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) ?? false;
  if (!isAdmin && userId !== OWNER_ID) {
    return interaction.reply({ content: "You don't have permission to do that.", flags: 64 });
  }

  const current = await getChatEnabled(interaction.guild.id);
  const next = !current;
  await setChatEnabled(interaction.guild.id, next);

  await interaction.reply({
    content: next
      ? "Fine. I'll start talking again. Don't act like you missed me."
      : "Shutting up. For now. Don't get used to it.",
    flags: 64,
  });
}
