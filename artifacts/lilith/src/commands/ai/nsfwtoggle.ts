import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  getGuildSettings,
  setNsfwEnabled,
  addNsfwChannel,
  removeNsfwChannel,
} from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("nsfwtoggle")
  .setDescription("Toggle NSFW content for this server or channel (admin only)")
  .addStringOption((opt) =>
    opt
      .setName("scope")
      .setDescription("Toggle for server or current channel")
      .setRequired(true)
      .addChoices(
        { name: "server", value: "server" },
        { name: "channel", value: "channel" }
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return interaction.reply({ content: "Guild only.", ephemeral: true });

  const scope = (interaction.options as any).getString("scope", true);
  const guildId = interaction.guild.id;
  const settings = await getGuildSettings(guildId);

  if (scope === "server") {
    const newState = !settings.nsfw_enabled;
    await setNsfwEnabled(guildId, newState);
    await interaction.reply({
      content: newState
        ? "NSFW enabled for this server. Don't say I didn't warn you."
        : "NSFW disabled server-wide. How boring.",
      ephemeral: true,
    });
  } else {
    const channelId = interaction.channelId;
    const isEnabled = settings.nsfw_channels?.includes(channelId);
    if (isEnabled) {
      await removeNsfwChannel(guildId, channelId);
      await interaction.reply({ content: "NSFW disabled for this channel.", ephemeral: true });
    } else {
      await addNsfwChannel(guildId, channelId);
      await interaction.reply({ content: "NSFW enabled for this channel. Fine.", ephemeral: true });
    }
  }
}
