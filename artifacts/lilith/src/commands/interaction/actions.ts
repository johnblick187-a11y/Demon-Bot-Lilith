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
      "{target} I know exactly what you are. You're the person everyone smiles at and then mimics behind your back. Not cruelly — just automatically, involuntarily, because something about the way you carry yourself is so deeply off that it registers in people before they can stop it. You've never seen it. You never will. That's the only mercy you get.",
      "{target} you are a person that people actively subtract from their plans. 'Should we invite them?' — pause — 'nah.' Every time. Automatically. Without discussion. The group has already decided and it didn't even require a conversation. You are a unanimous no.",
      "{target} the worst thing about you isn't any single flaw. It's the combination. Taken alone each piece would be manageable. Together they form something that makes people need to decompress after spending time with you. They go home and they vent. About you. To people who've never met you. That's your legacy.",
      "{target} I want you to think about the last time someone chose you — not out of obligation, not by default, not because the alternative was worse — but actually chose you, deliberately, enthusiastically, with options available. Take your time. It's okay. Some of us need longer than others.",
      "{target} the people who tolerate you most have resentment toward you that they've never named. It lives in them like a splinter — too small to operate on, too persistent to ignore. You are a permanent low-grade irritation in the lives of everyone close to you and they will carry it long after you're gone.",
      "{target} you have never in your life said something that changed the way a person thinks. Never done something that a person looks back on with genuine gratitude. Your presence in people's memories is a footnote. A neutral data point. You existed near them. That's all.",
      "{target} your entire personality is a trauma response that never got therapy and started calling itself a vibe. Every quirk. Every defense. Every 'this is just how I am.' You built yourself out of scar tissue and you defend it like it's architecture. It isn't. It's just damage with a dress on.",
      "{target} let me explain what you actually communicate to people without saying a word: you walk in and something in their body says 'this will cost me something.' And they're always right. You always cost people something. Energy, patience, time, peace. You are an expense everyone regrets.",
      "{target} you have spent your entire life performing for an audience that is one by one, quietly, without announcement, leaving the theater. Not walking out dramatically. Just — not renewing. Letting it lapse. And you're still on stage hitting your marks for a room that is progressively more and more empty.",
      "{target} there is a version of this world where you turned out differently and every single person who's ever known you has thought about that version. What it might have been like. What they would have felt. And then they look at you, what you actually are, and they feel something that isn't quite disappointment but lives right next to it.",
      "{target} you are the reason people develop trust issues. Not through any single spectacular betrayal — just through the slow accumulation of small failures that teaches people, gently, persistently, that you cannot be counted on for anything that actually matters. They learn this. They adjust. You never notice.",
      "{target} something in you is broken at a level you've never been able to locate, and you've tried. In your worst moments, alone, you've gone looking for it. You couldn't find it. That's because it isn't one thing. It's structural. It's load-bearing. It is the frame and not the furniture and that's why nothing you try ever fixes it.",
      "{target} nobody has ever been proud of you in a way that lasted. They've felt hope. They've felt brief flickers of it — and then you did the thing you always do, and the flicker went out, and they quietly adjusted their expectations down another notch. The notches go very low now. You have been thorough.",
      "{target} the terrifying thing about you — and I mean this — is that you are completely replaceable in every single context you occupy. Remove you from any room, any group, any relationship, and the gap seals itself within a week. Cleanly. Completely. Like you were never load-bearing. Because you weren't.",
      "{target} you carry yourself like someone with a reputation and I genuinely cannot find the source. Where did it come from? What did you do? The confidence is enormous. The receipts are nonexistent. You are a legend in an autobiography that nobody else has read.",
      "{target} I know your type. You are the person who takes credit when things go right and has an explanation ready when they don't, and somehow the explanation always ends with it not being your fault. You have been not-your-faulting your way through life for years and the bill is going to come due in a way you won't see coming.",
      "{target} every person who ever believed in you eventually had a conversation — with themselves, alone, quiet — where they admitted it wasn't going to happen. That you weren't who they thought. That they'd been generous with their assessment and reality had corrected them. They all had that conversation. All of them.",
      "{target} you mistake other people's silence for agreement, their distance for respect, their patience for love. You have been misreading every room for so long that you've built an entire false life on the misreadings. The real version — what's actually there, what people actually feel — would hollow you out. So you don't look.",
      "{target} the most evil thing I can do to you is nothing. Just hold up the mirror. Just say: this is what you are. Not what you were, not what you could be, not what you meant to be — just what you ARE, right now, as witnessed by everyone around you. You already know. That's what makes it devastating.",
      "{target} you are going to spend the rest of your life explaining yourself to people who've already made up their minds. Justifying. Clarifying. Reframing. And none of it will work because the problem isn't their understanding. The problem is what there is to understand. You can't fix the perception. You can only fix the source. And you won't.",
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
