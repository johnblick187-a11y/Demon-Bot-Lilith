import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { setForcedPersonality, getForcedPersonality, LilithMode } from "../../lib/ai.js";

export const data = new SlashCommandBuilder()
  .setName("temperament")
  .setDescription("Switch Lilith's temperament (owner only)")
  .addStringOption((opt) =>
    opt
      .setName("mode")
      .setDescription("The personality mode to switch to")
      .setRequired(true)
      .addChoices(
        { name: "Normal", value: "default" },
        { name: "Chaos", value: "chaos" }
      )
  )
  .setDefaultMemberPermissions(0n);

const MODE_RESPONSES: Record<string, string> = {
  natural: "Back to my natural state. Don't mistake this for softness.",
  chaos: "CHAOS MODE. I HAVE BEEN WAITING FOR THIS. I HAVE BEEN SO PATIENT. NOT ANYMORE.",
};

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "You don't have that authority.", flags: 64 });
  }

  const raw = (interaction.options as any).getString("mode", true) as LilithMode;
  // "Normal" means clear the forced mode → natural affinity/annoyance-driven behavior
  const newForced: LilithMode | null = raw === "default" ? null : raw;
  const current = getForcedPersonality();

  if (current === newForced) {
    const label = newForced === null ? "natural" : newForced;
    return interaction.reply({
      content: `Already in **${label}** mode. Pay attention.`,
      flags: 64,
    });
  }

  setForcedPersonality(newForced);

  const responseKey = newForced === null ? "natural" : newForced;
  await interaction.reply({
    content: MODE_RESPONSES[responseKey] ?? "Done.",
  });
}
