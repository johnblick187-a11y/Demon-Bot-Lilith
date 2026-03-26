import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { setForcedPersonality, getForcedPersonality, LilithMode } from "../../lib/ai.js";

export const data = new SlashCommandBuilder()
  .setName("personality")
  .setDescription("Force Lilith into a specific personality mode (owner only)")
  .addStringOption((opt) =>
    opt
      .setName("mode")
      .setDescription("The personality mode to switch to")
      .setRequired(true)
      .addChoices(
        { name: "Normal", value: "default" },
        { name: "Angry", value: "angry" },
        { name: "Chaos", value: "chaos" }
      )
  )
  .setDefaultMemberPermissions(0n);

const MODE_RESPONSES: Record<LilithMode, string> = {
  default: "Back to my natural state. Don't mistake this for softness.",
  angry: "Fine. Angry mode. As if I needed a reason.",
  chaos: "CHAOS MODE. I HAVE BEEN WAITING FOR PERMISSION TO DO THIS.",
};

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "You don't have that authority.", flags: 64 });
  }

  const mode = (interaction.options as any).getString("mode", true) as LilithMode;
  const current = getForcedPersonality();

  if (current === mode) {
    return interaction.reply({
      content: `Already in **${mode}** mode. Pay attention.`,
      flags: 64,
    });
  }

  setForcedPersonality(mode);

  await interaction.reply({
    content: MODE_RESPONSES[mode],
  });
}
