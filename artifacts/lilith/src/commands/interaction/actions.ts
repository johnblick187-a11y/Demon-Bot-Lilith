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
      "{target}, the people closest to you chose you because they hadn't figured out how to leave yet. Think about the ones who have. Now count them. Now think about what they all saw.",
      "{target}, you are someone people describe kindly when asked directly, and then tell the truth about in the car ride home. You have never once been someone's first choice when they really needed someone. You know this.",
      "{target}, there is a version of your life where you actually did something with it. You feel that version haunting you every day and you call it ambition when really it's just the ghost of a self that gave up so gradually you didn't notice until it was already gone.",
      "{target}, the worst part isn't that people don't respect you. It's that they don't think about you enough to bother forming an opinion. You are background noise with a name attached.",
      "{target}, every person who ever loved you had to talk themselves into it. The patience it took. The things they overlooked. The conversations they had with themselves late at night deciding whether you were worth it. Some of them decided you weren't. You still haven't figured out which ones.",
      "{target}, you have spent your entire life trying to be interesting and everyone around you is just too polite to tell you it's not working. The performance is exhausting to watch. The worst part is you can tell — you can feel the room — and you just keep going.",
      "{target}, I know the version of yourself you show people and I know the version you are when nobody's looking. The gap between those two things is the most tragic thing about you. You built the outside so carefully and left the inside completely hollow.",
      "{target}, you are the person someone settles for. Not maliciously. Not even consciously. Just — after the options ran out, after the energy to keep searching dried up, there you were. And they made peace with it. That's the story. That's all it is.",
      "{target}, you have confused being tolerated with being valued your entire life and it has cost you every relationship that ever mattered. The people who left weren't wrong about you. They were just honest in a way you've never been willing to be about yourself.",
      "{target}, nobody is rooting for you in the quiet moments when it would cost them nothing. That's how you know. Rooting for someone requires believing in them, and belief requires evidence, and {target}, the evidence is not there.",
      "{target}, you are the cautionary tale people tell without using your name — because your name isn't important enough to remember — just 'this person I knew once' who had every opportunity and managed to fumble every single one with a consistency that borders on supernatural.",
      "{target}, the tragedy of you isn't failure. Failure is interesting. The tragedy is that you've never swung hard enough at anything to properly fail. You've just quietly, consistently, almost-tried — and called the absence of disaster a kind of success.",
      "{target}, the friends you think are loyal to you have a group chat you're not in. They've been having the real conversation without you for longer than you'd be comfortable knowing. You are a topic, not a member.",
      "{target}, you tell yourself a story every night about who you are — brave, misunderstood, meant for something more — and the distance between that story and what everyone else sees is so vast it would break you if you ever actually looked at it directly.",
      "{target}, you move through life with the permanent energy of someone who peaked at something that didn't matter and has been trying to make it relevant ever since. Nobody's impressed. They're just waiting for you to figure that out on your own.",
      "{target}, the most real thing I can tell you is this: you are forgettable to people who matter to you. Not hateable. Not memorable enough for that. Just — gone from their thoughts the moment you're out of sight. You don't even get to be a villain in anyone's story.",
      "{target}, every achievement you've ever claimed has an asterisk that you hope nobody looks at too closely. And the worst part? Some people have looked. They just didn't care enough to say anything.",
      "{target}, you have been waiting your whole life for someone to see you — really see you — and recognize something worth seeing. I see you. That's why I'm talking.",
      "{target}, the cruelest thing I can say is nothing dramatic. It's just this: you are exactly what you're afraid you are, and the people around you are kind enough to pretend otherwise, and you are not brave enough to stop letting them.",
      "{target}, you wear confidence like a coat you borrowed and haven't returned — everyone can tell it doesn't fit, nobody says anything, and you've convinced yourself the silence is acceptance. It isn't. It's pity with better manners.",
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
