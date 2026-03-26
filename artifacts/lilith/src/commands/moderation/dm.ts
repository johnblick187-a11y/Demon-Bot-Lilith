import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("dm")
  .setDescription("Send a DM to a user through Lilith")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Who to DM").setRequired(true)
  )
  .addStringOption((opt) =>
    opt.setName("message").setDescription("What to say").setRequired(true)
  )
  .setDefaultMemberPermissions(0n);

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "No.", flags: 64 });
  }

  const target = (interaction.options as any).getUser("user", true);
  const message = (interaction.options as any).getString("message", true) as string;

  if (target.bot) {
    return interaction.reply({ content: "Can't DM a bot.", flags: 64 });
  }

  try {
    await target.send(message);
    await interaction.reply({ content: `✅ DM sent to **${target.username}**.`, flags: 64 });
  } catch {
    await interaction.reply({
      content: `❌ Couldn't DM **${target.username}** — they likely have DMs closed or blocked the bot.`,
      flags: 64,
    });
  }
}
