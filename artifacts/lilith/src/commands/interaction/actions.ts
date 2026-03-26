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

const VIOLENT_ACTIONS = ["punch", "slap", "headbutt", "stab", "shoot", "roast", "bite"];

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
    name: "roast",
    description: "Roast a user",
    emoji: "🔥",
    phrases: [
      "{target} you are genuinely one of the worst things to happen to anyone who's had the misfortune of knowing you. Not in a dramatic way. In a quiet, grinding, soul-draining way that people don't notice until they're already exhausted. You are the slow leak. The carbon monoxide. Odorless, invisible, and suffocating.",
      "{target} I don't even have to try with you. You've already done all the work. You handed me everything I need just by existing the way you do in public. It's embarrassing. It's almost charitable of me to say it out loud so you finally know.",
      "{target} you are the kind of person that makes other people feel better about their lives just by comparison. Not because you're dramatic or awful — because you're a walking reminder that it could be worse. That's your function. That's all you contribute.",
      "{target} I want you to think about your closest friend and then ask yourself honestly — if they could swap you out right now, no guilt, no consequences — would they? You already know the answer. You've always known. You just can't afford to say it.",
      "{target} your whole personality is something you assembled from things you thought people would like, and the terrifying part is it STILL didn't work. You tried to build something appealing and people still walk away. That's not bad luck. That's information.",
      "{target} everyone who has ever cared about you has a moment — a specific, remembered moment — where they realized you weren't who they thought you were. They didn't say it. They filed it. That file has been growing for years and you have no idea how thick it is.",
      "{target} the way you talk about yourself in public versus what you actually are in private is a level of fraud that should be criminal. You have constructed an entire mythology around a self that doesn't exist and you DEFEND it. Aggressively. Because if the mythology falls, there's nothing underneath. You know that. That's why you're like this.",
      "{target} something is deeply, fundamentally wrong with you and it's not the interesting kind of wrong. It's the kind people learn to work around silently because addressing it feels pointless. You are a permanent accommodation everyone makes and nobody mentions.",
      "{target} let me tell you what you actually are, stripped of every excuse you've constructed: a person who had real chances and sabotaged every single one, then rewrote the story so the sabotage was someone else's fault. You've been doing this your whole life. The cast changes. The pattern doesn't.",
      "{target} you have mistaken people being too tired to correct you for people agreeing with you. Those are not the same thing. The silence you've been reading as validation is actually just exhaustion. They've given up. That's what you're standing in.",
      "{target} I find you fascinating the way you find a car crash fascinating. Something went very wrong somewhere and now there's wreckage everywhere and everyone's slowing down to look but nobody's stopping to help because it's clear the damage was self-inflicted.",
      "{target} you emit this specific energy that makes people feel like they have to manage you. Not help you. Manage you. There's a difference. Help implies they believe in your potential. Management is just damage control. You have never been helped. You have always been managed.",
      "{target} the version of you that exists in your head — confident, magnetic, sharp — is so far from the version everyone else experiences that it constitutes a break from reality. And the gap is getting wider. You can feel it getting wider. That's what that feeling is.",
      "{target} you know what's actually funny? You think you're the problem because you're too much. You're not. You're the problem because you're hollow and loud at the same time and people can hear the echo. There's nothing in there and the volume just makes it more obvious.",
      "{target} every relationship you've ever had has had an expiration date that everyone else could see and you couldn't. They all ended the same way. For the same reason. And you've never once asked yourself what the common variable is.",
      "{target} you have this gift — and I use that word with complete contempt — for making every situation slightly worse than it needed to be. Not catastrophically. Just a few degrees colder. A little more tense. A little more draining. You are a consistent, reliable downgrade on any moment you enter.",
      "{target} people don't tell you the truth about yourself because it's not worth the aftermath. You don't take feedback — you take it as an attack, and then you make it everyone else's problem for days. So they stopped. A long time ago. What you think is acceptance is just people deciding you're not worth the trouble of honesty.",
      "{target} your confidence has no business existing at the scale it does given the evidence available. It is unearned, unexamined, and frankly insulting to everyone around you who put in real work to feel okay about themselves. You just decided you were fine. Delusion as a life strategy. Remarkable.",
      "{target} I want you to sit with this: the people who know you best advocate for you the least. When your name comes up, they go quiet or they change the subject. Not out of loyalty. Out of the fact that there's nothing good to say that wouldn't feel like a lie.",
      "{target} you are not misunderstood. That's the story you tell yourself because it's more comfortable than the truth, which is that people understand you perfectly and have made their assessment accordingly. You've been understood this whole time. That's the problem.",
    ],
    annoyanceDelta: ANNOYANCE_TABLE.roast,
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
