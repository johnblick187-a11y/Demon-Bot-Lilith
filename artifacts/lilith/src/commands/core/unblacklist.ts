import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { unblacklistUser } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("unblacklist")
  .setDescription("Remove a user from Lilith's blacklist (owner only)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("User to unblacklist").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "Not for you.", flags: 64 });
  }

  const target = (interaction.options as any).getUser("user", true);

  if (target.id === OWNER_ID) {
    return interaction.reply({ content: "That's you. What are you doing.", flags: 64 });
  }

  const found = await unblacklistUser(target.id);

  if (!found) {
    return interaction.reply({
      content: `**${target.username}** wasn't blacklisted. Nothing to undo.`,
      flags: 64,
    });
  }

  await interaction.reply({
    content: `**${target.username}** has been unblacklisted. Annoyance reset. Incident count cleared. Don't make me regret this.`,
    flags: 64,
  });
}
