import { SlashCommandBuilder, CommandInteraction } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import { getPersonalityFloor, setPersonalityFloor } from "../../lib/db.js";

const MODE_ORDER = ["default", "angry", "chaos"] as const;
type ModeFloor = (typeof MODE_ORDER)[number];

const LABEL: Record<string, string> = {
  default: "computed (no floor)",
  angry:   "ANGRY — she stays hostile regardless",
  chaos:   "CHAOS — she stays completely unhinged",
};

export const data = new SlashCommandBuilder()
  .setName("personality")
  .setDescription("Force a minimum personality mode for this server (owner only)")
  .addStringOption((opt) =>
    opt
      .setName("mode")
      .setDescription("Minimum mode — can only go up, not down")
      .setRequired(true)
      .addChoices(
        { name: "angry",               value: "angry"  },
        { name: "chaos",               value: "chaos"  },
        { name: "reset (back to computed)", value: "reset"  },
      )
  )
  .setDefaultMemberPermissions(0n);

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "You don't have that authority.", flags: 64 });
  }

  const guildId = interaction.guild?.id;
  if (!guildId) {
    return interaction.reply({ content: "This command only works in a server.", flags: 64 });
  }

  const selected = (interaction.options as any).getString("mode", true) as string;
  const current = await getPersonalityFloor(guildId);

  if (selected === "reset") {
    await setPersonalityFloor(guildId, null);
    return interaction.reply({
      content: `Personality floor reset. Back to computed mode — she'll react to people as their annoyance/affinity dictates.`,
      flags: 64,
    });
  }

  const currentIdx = current ? MODE_ORDER.indexOf(current as ModeFloor) : 0;
  const selectedIdx = MODE_ORDER.indexOf(selected as ModeFloor);

  if (current && selectedIdx <= currentIdx) {
    return interaction.reply({
      content: `Already locked at **${current}**. Can't go lower through this command. Use reset first if needed.`,
      flags: 64,
    });
  }

  await setPersonalityFloor(guildId, selected);
  return interaction.reply({
    content: `Personality floor set to **${selected}** — ${LABEL[selected]}`,
    flags: 64,
  });
}
