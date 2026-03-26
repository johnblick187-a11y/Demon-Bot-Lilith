import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { getDmNsfwEnabled, setDmNsfwEnabled } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("dmmode")
  .setDescription("Toggle owner DM NSFW mode (owner only)")
  .setDefaultMemberPermissions(0n)
  .addStringOption((opt) =>
    opt
      .setName("action")
      .setDescription("on / off / status")
      .setRequired(true)
      .addChoices(
        { name: "on", value: "on" },
        { name: "off", value: "off" },
        { name: "status", value: "status" }
      )
  );

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "Not for you.", flags: 64 });
  }

  const action = (interaction.options as any).getString("action", true);
  const current = await getDmNsfwEnabled();

  if (action === "status") {
    return interaction.reply({
      content: `DM NSFW mode is currently **${current ? "ON" : "OFF"}**.`,
      flags: 64,
    });
  }

  const newState = action === "on";
  if (newState === current) {
    return interaction.reply({
      content: `DM NSFW mode is already **${current ? "ON" : "OFF"}**.`,
      flags: 64,
    });
  }

  await setDmNsfwEnabled(newState);
  return interaction.reply({
    content: newState
      ? "DM NSFW mode **ON**. I'll be waiting."
      : "DM NSFW mode **OFF**. Back to normal.",
    flags: 64,
  });
}
