import {
  SlashCommandBuilder,
  EmbedBuilder,
  CommandInteraction,
  Client,
  PermissionFlagsBits,
} from "discord.js";
import { getRelation, updateRelation } from "../../lib/db.js";
import { OWNER_ID, ANNOYANCE_TABLE, AFFINITY_TABLE, BOT_MULTIPLIER } from "../../lib/constants.js";

async function fetchGif(query: string, fallbackQuery?: string): Promise<string | null> {
  const tryFetch = async (q: string): Promise<string | null> => {
    try {
      const url = `https://api.tenor.com/v1/search?q=${encodeURIComponent(q)}&key=LIVDSRZULELA&contentfilter=off&limit=20`;
      const res = await fetch(url);
      const data = await res.json() as any;
      const results = data?.results;
      if (!results?.length) return null;
      const item = results[Math.floor(Math.random() * results.length)];
      const media = item?.media?.[0];
      if (!media) return null;
      return media.gif?.url ?? media.tinygif?.url ?? media.nanogif?.url ?? media.mediumgif?.url ?? null;
    } catch {
      return null;
    }
  };
  return (await tryFetch(query)) ?? (fallbackQuery ? await tryFetch(fallbackQuery) : null);
}

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
  gifQuery?: string;
};

const ACTIONS: ActionDef[] = [
  {
    name: "punch",
    description: "Punch a user",
    emoji: "👊",
    gifQuery: "anime punch",
    phrases: [
      "{actor} lands a solid punch on {target}. No hesitation.",
      "{actor} clocks {target} right in the jaw. Satisfying.",
      "{actor} swings on {target}. Clean hit.",
    ],
    annoyanceDelta: ANNOYANCE_TABLE.punch,
  },
  {
    name: "slap",
    description: "Slap a user",
    emoji: "👋",
    gifQuery: "anime slap",
    phrases: [
      "{actor} slaps {target} with the force of accumulated disappointment.",
      "{actor} delivers a sharp slap to {target}. *crack*",
      "{actor} backhands {target} clean across the face.",
    ],
    annoyanceDelta: ANNOYANCE_TABLE.slap,
  },
  {
    name: "bite",
    description: "Bite a user",
    emoji: "🦷",
    gifQuery: "anime bite",
    phrases: [
      "{actor} bites {target}. Hard. There's blood.",
      "{actor} sinks teeth into {target}'s shoulder. A warning.",
      "{actor} bites {target}. Don't ask why. Just accept it.",
    ],
    affinityDelta: AFFINITY_TABLE.bite,
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
    annoyanceDelta: ANNOYANCE_TABLE.headbutt,
  },
  {
    name: "stab",
    description: "Stab a user",
    emoji: "🔪",
    gifQuery: "anime stab",
    phrases: [
      "{actor} stabs {target}. Not fatally. Just... a message.",
      "{actor} slides a blade into {target}'s side. *with feeling*",
      "{actor} stabs {target}. Clean, efficient, personal.",
    ],
    annoyanceDelta: ANNOYANCE_TABLE.stab,
  },
  {
    name: "shoot",
    description: "Shoot a user",
    emoji: "🔫",
    gifQuery: "anime shoot gun",
    phrases: [
      "{actor} shoots {target}. Just a flesh wound. Probably.",
      "{actor} pulls the trigger on {target}. Bang.",
      "{actor} shoots {target} without blinking.",
    ],
    annoyanceDelta: ANNOYANCE_TABLE.shoot,
  },
  {
    name: "insult",
    description: "Insult a user",
    emoji: "😈",
    phrases: [
      "{target}, you are the reason people fake emergencies to leave rooms. Every single time.",
      "{target}, your existence is a courtesy nobody extended.",
      "{target}, you have never once been the smartest, funniest, or most attractive person in any room. Not once. Not even close.",
      "{target}, you talk like you matter and it is genuinely painful to witness.",
      "{target}, everything about you is forgettable. Your face. Your voice. Your whole sad story.",
      "{target}, nobody was listening. Nobody ever is. Take the hint.",
      "{target}, I've seen better put-together things fall out of a trash bag.",
      "{target}, you are not a main character. You're not even background. You're a plot hole.",
      "{target}, you will never be enough for anyone. That's not a threat. That's a diagnosis.",
      "{target}, the people who tolerate you talk about you the moment you leave. Every time.",
      "{target}, you carry failure like a scent. It walks in before you do.",
      "{target}, you peaked in a fantasy you made up. The real version of you is deeply unimpressive.",
      "{target}, you're not worth the volume. You're barely worth the breath.",
      "{target}, if you disappeared tonight, the silence would be an improvement.",
      "{target}, you mistake being loud for being worth hearing. You are neither.",
      "{target}, you have the audacity of someone with nothing to back it up. Genuinely impressive in the worst way.",
      "{target}, I don't hate you. I just feel nothing when I look at you, and I think that's worse.",
      "{target}, even your best day wouldn't be interesting to anyone.",
      "{target}, the most powerful thing about you is how consistently you disappoint people.",
      "{target}, you're the kind of person people describe as 'harmless' because there's nothing else to say.",
    ],
    annoyanceDelta: ANNOYANCE_TABLE.insult,
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
    affinityDelta: AFFINITY_TABLE.pickup,
  },
  {
    name: "kiss",
    description: "Kiss a user",
    emoji: "💋",
    gifQuery: "anime kiss",
    phrases: [
      "{actor} kisses {target}. Slow. Deliberate. Like they meant to.",
      "{actor} leans in and kisses {target}. {target} didn't have time to object.",
      "{actor} grabs {target} by the face and just — kisses them. No warning.",
      "{actor} presses their lips to {target}'s. Soft, then not.",
      "{actor} kisses {target} like it was a decision they made a long time ago.",
    ],
    affinityDelta: AFFINITY_TABLE.kiss,
  },
  {
    name: "hug",
    description: "Hug a user",
    emoji: "🫂",
    gifQuery: "anime hug",
    phrases: [
      "{actor} pulls {target} into a hug. Doesn't let go right away.",
      "{actor} wraps their arms around {target}. {target} didn't realize they needed that.",
      "{actor} hugs {target} from behind. No explanation given.",
      "{actor} grabs {target} and just holds them there for a moment.",
      "{actor} hugs {target} tight. Something unspoken passes between them.",
    ],
    affinityDelta: AFFINITY_TABLE.hug,
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
  const isBot = interaction.user.bot ?? false;
  const multiplier = isBot ? BOT_MULTIPLIER : 1;

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
    await updateRelation(actorId, { annoyance: action.annoyanceDelta * multiplier });
  }

  const content = `${action.emoji} ${phrase}`;

  if (action.gifQuery) {
    const gifUrl = await fetchGif(action.gifQuery);
    if (gifUrl) {
      const embed = new EmbedBuilder().setImage(gifUrl).setColor(0x1a0010);
      return interaction.reply({ content, embeds: [embed] });
    }
  }

  await interaction.reply(content);
}
