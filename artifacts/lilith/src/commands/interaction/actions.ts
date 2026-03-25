import {
  SlashCommandBuilder,
  EmbedBuilder,
  CommandInteraction,
  Client,
  PermissionFlagsBits,
} from "discord.js";
import { getRelation, updateRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

const VIOLENT_ACTIONS = ["punch", "slap", "headbutt", "stab", "shoot", "insult", "bite"];

const RETALIATION_MSGS = [
  "That's tweakbrazy. **{actor}** just made the worst decision of their server life.",
  "**{actor}** swung on tweakbrazy. *Interesting choice.* Let me fix that.",
  "Oh, **{actor}** wants to touch tweakbrazy? Bold. Wrong. Goodbye.",
  "**{actor}** just signed their own removal order. Nobody touches tweakbrazy.",
  "Did **{actor}** just—? No. Absolutely not. This ends now.",
];

async function interceptOwnerAttack(
  interaction: CommandInteraction,
  actorName: string,
  actionName: string,
  client: Client
): Promise<boolean> {
  const target = (interaction.options as any).getUser("user", true);
  if (target.id !== OWNER_ID) return false;
  if (interaction.user.id === OWNER_ID) return false;
  if (!VIOLENT_ACTIONS.includes(actionName)) return false;

  const msg = RETALIATION_MSGS[Math.floor(Math.random() * RETALIATION_MSGS.length)]
    .replace("{actor}", `**${actorName}**`);

  await interaction.reply(`🩸 ${msg}`);

  const guild = interaction.guild;
  if (guild) {
    try {
      const me = guild.members.me;
      if (me?.permissions.has(PermissionFlagsBits.BanMembers)) {
        await guild.bans.create(interaction.user.id, {
          reason: `Attacked tweakbrazy. Automatic ban by Lilith.`,
        });
        await interaction.followUp({ content: `Banned. Don't come back.`, ephemeral: false });
      } else if (me?.permissions.has(PermissionFlagsBits.KickMembers)) {
        await guild.members.kick(interaction.user.id, `Attacked tweakbrazy. Kicked by Lilith.`);
        await interaction.followUp({ content: `Kicked. Consider yourself lucky.`, ephemeral: false });
      }
    } catch {}
  }

  try {
    const owner = await client.users.fetch(OWNER_ID);
    await owner.send(
      `⚠️ **Retaliation Triggered**\n**User:** ${interaction.user.username} (${interaction.user.id})\n**Action:** /${actionName}\n**Server:** ${guild?.name ?? "Unknown"}\n\nLilith intervened.`
    );
  } catch {}

  return true;
}

type ActionDef = {
  name: string;
  description: string;
  phrases: string[];
  affinityDelta?: number;
  annoyanceDelta?: number;
  emoji: string;
};

const ACTIONS: ActionDef[] = [
  {
    name: "punch",
    description: "Punch a user",
    emoji: "👊",
    phrases: [
      "{actor} lands a solid punch on {target}. No hesitation.",
      "{actor} clocks {target} right in the jaw. Satisfying.",
      "{actor} swings on {target}. Clean hit.",
    ],
    annoyanceDelta: 3,
  },
  {
    name: "slap",
    description: "Slap a user",
    emoji: "👋",
    phrases: [
      "{actor} slaps {target} with the force of accumulated disappointment.",
      "{actor} delivers a sharp slap to {target}. *crack*",
      "{actor} backhands {target} clean across the face.",
    ],
    annoyanceDelta: 2,
  },
  {
    name: "bite",
    description: "Bite a user",
    emoji: "🦷",
    phrases: [
      "{actor} bites {target}. Hard. There's blood.",
      "{actor} sinks teeth into {target}'s shoulder. A warning.",
      "{actor} bites {target}. Don't ask why. Just accept it.",
    ],
    affinityDelta: 2,
  },
  {
    name: "headbutt",
    description: "Headbutt a user",
    emoji: "💥",
    phrases: [
      "{actor} headbutts {target}. Stars everywhere.",
      "{actor} slams their head into {target}'s face. Both dazed.",
      "{actor} delivers a brutal headbutt to {target}.",
    ],
    annoyanceDelta: 1,
  },
  {
    name: "stab",
    description: "Stab a user",
    emoji: "🔪",
    phrases: [
      "{actor} stabs {target}. Not fatally. Just... a message.",
      "{actor} slides a blade into {target}'s side. *with feeling*",
      "{actor} stabs {target}. Clean, efficient, personal.",
    ],
    annoyanceDelta: 5,
  },
  {
    name: "shoot",
    description: "Shoot a user",
    emoji: "🔫",
    phrases: [
      "{actor} shoots {target}. Just a flesh wound. Probably.",
      "{actor} pulls the trigger on {target}. Bang.",
      "{actor} shoots {target} without blinking.",
    ],
    annoyanceDelta: 5,
  },
  {
    name: "insult",
    description: "Insult a user",
    emoji: "😈",
    phrases: [
      "{actor} tells {target} that their personality is a before picture.",
      "{actor} informs {target} that they're the human equivalent of a participation trophy.",
      "{actor} looks {target} dead in the eyes and says 'you disappoint every room you walk into.'",
      "{actor} tells {target}: 'You have the energy of a damp sock.'",
    ],
    annoyanceDelta: 3,
  },
  {
    name: "pickup",
    description: "Use a pickup line on a user",
    emoji: "💋",
    phrases: [
      "{actor} to {target}: 'Are you a demon? Because you've been haunting my thoughts.'",
      "{actor} to {target}: 'If looks could kill, you'd be a war crime.'",
      "{actor} to {target}: 'I'd sell my soul for a conversation with you.'",
      "{actor} to {target}: 'Hell must be missing an angel... wait, wrong vibe. Missing a demon.'",
    ],
    affinityDelta: 3,
  },
];

export const commands = ACTIONS.map((action) => {
  const builder = new SlashCommandBuilder()
    .setName(action.name)
    .setDescription(action.description)
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Target user").setRequired(true)
    );
  return { data: builder, action };
});

export async function execute(interaction: CommandInteraction, action: ActionDef, client?: Client) {
  const target = (interaction.options as any).getUser("user", true);
  const actorId = interaction.user.id;
  const actorName = interaction.user.username;

  if (client) {
    const intercepted = await interceptOwnerAttack(interaction, actorName, action.name, client);
    if (intercepted) return;
  }

  const phrase =
    action.phrases[Math.floor(Math.random() * action.phrases.length)]
      .replace("{actor}", `**${actorName}**`)
      .replace("{target}", `**${target.username}**`);

  if (action.affinityDelta) {
    await updateRelation(actorId, { affinity: action.affinityDelta });
  }
  if (action.annoyanceDelta) {
    await updateRelation(actorId, { annoyance: action.annoyanceDelta });
  }

  await interaction.reply(`${action.emoji} ${phrase}`);
}
