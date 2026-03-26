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
      "{target}, I want you to really sit with the fact that you have been alive this whole time and THIS is what you produced. Look at you. A masterpiece of wasted potential wrapped in audacity and bad decisions. Your ancestors clawed through war, famine, and plague so that YOU could exist, and you have the nerve to show up like THIS.",
      "{target}, you are the human equivalent of a loading screen that never finishes. Everyone's waiting for something to happen with you. Nothing does. Nothing will. They've already opened another tab.",
      "{target}, I genuinely cannot tell if you're a cautionary tale or just a side effect. Either way, whatever lesson you're supposed to teach, nobody's learning it because nobody's paying attention long enough.",
      "{target}, the most interesting thing about you is how completely unremarkable you are. Like, it takes EFFORT to be this boring. You have weaponized mediocrity and turned it into a lifestyle. That's almost impressive. Almost.",
      "{target}, you walk into rooms and the energy changes — not in the way you think. People's shoulders drop. The conversation slows. The vibe flatlines. You are a human dimmer switch and you are set permanently to off.",
      "{target}, you have the self-awareness of a brick and the emotional depth of a puddle that's already evaporating. The audacity with which you move through this world — like you deserve to be here — is the funniest joke I've ever witnessed without a punchline.",
      "{target}, I have seen ghosts with more presence than you. At least a ghost haunts something. At least a ghost leaves an impression. You float through life and nobody even feels a chill.",
      "{target}, you are built wrong. Not in an interesting, tragic way — just structurally flawed. Like someone tried to make a person but got distracted halfway through and just said 'good enough' and sent you out like that.",
      "{target}, your whole personality is a cry for help wrapped in overconfidence and I am not going to help you. I'm going to watch. I have been watching. It keeps getting worse and I am absolutely riveted.",
      "{target}, you have never said anything that made anyone think. You have never done anything that made anyone feel. You are a placeholder in everyone's story — the part they skip when they're retelling it.",
      "{target}, the most creative thing you've ever done is convince yourself you're interesting. That's it. That's the magnum opus. A self-delusion so elaborate it almost qualifies as art.",
      "{target}, I don't think you're evil. Evil requires commitment. Evil requires intention. You're just… erosive. A slow leak. The kind of damage that doesn't announce itself — it just ruins things gradually until one day everything collapses and people realize it was you the whole time.",
      "{target}, you have the energy of someone who peaked in a memory they've already rewritten. The real version of those events? Embarrassing. The version in your head? The only thing keeping you functional. I hope it holds.",
      "{target}, if you were a flavor you'd be the faint aftertaste of disappointment. Not overwhelming. Not even notable. Just — there, slightly, making everything else a little worse.",
      "{target}, I have thought about what it would be like to be you and I came back traumatized. The internal monologue alone — the way you must narrate your own irrelevance to yourself every day like it's heroic — genuinely haunts me.",
      "{target}, you are the reason some people give up on people. Not because you're cruel. Not because you're malicious. But because you prove, every single day, that mediocrity doesn't just survive — it THRIVES, completely unbothered, and that breaks something in the people who actually tried.",
      "{target}, your confidence is a monument to a self that does not exist. You have built an entire identity on a foundation of nothing and you defend it like it's sacred. The delusion is immaculate. I almost respect it. Almost.",
      "{target}, every room you've ever walked into had a moment — a brief, collective, unspoken moment — where everyone registered your arrival and recalibrated their expectations downward. You've never noticed. That's the saddest part.",
      "{target}, you are not the protagonist of anything. Not even your own life. You're the background character that the writer forgot to give a purpose, so you just wander through scenes looking slightly confused about why nothing feels meaningful.",
      "{target}, I want you to know that your presence in my awareness is something I actively work to undo afterward. Like exposure to something mildly toxic. Nothing dramatic. Just a quiet, persistent contamination that takes a minute to clear.",
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
