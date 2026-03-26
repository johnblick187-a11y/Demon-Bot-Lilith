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
      "{target}, I've been watching you perform 'having it together' for a while now and I want you to know — we all see the seams. Every single one of us. We just let you keep going because watching you hold it together with sheer delusion is the most entertaining thing you've ever produced.",
      "{target}, you know that person in everyone's life who they keep around out of guilt, habit, or morbid curiosity? Congratulations. You have never once been kept around for any other reason. Not once. In your entire life. Sit with that.",
      "{target}, there are people in your life right now who are actively planning their exit. They've made the decision. They're just waiting for the right moment. You can probably feel it — that slight distance, that shift in energy — and you keep telling yourself you're imagining it. You're not.",
      "{target}, you have this spectacular ability to be exactly wrong about yourself in every direction simultaneously. You think you're too much in all the places you're not enough, and completely invisible in the places you're suffocating people. It's an almost demonic miscalibration.",
      "{target}, I want to describe your vibe to you clinically: you are what happens when deep insecurity gets a costume. The costume changes. The insecurity doesn't. Everyone can see the zipper. You are the only one who thinks the mask is working.",
      "{target}, the most diabolical thing I know about you isn't anything you've done — it's what you haven't. The version of you that actually showed up. That tried. That committed to something real. That version never arrived and you've been making excuses for its absence for years. You know exactly which ones I mean.",
      "{target}, somewhere along the line you decided that surviving was the same as living and you built an entire identity around that lie. Every person who actually chose something — risked something — makes you uncomfortable because they expose what you've been doing, which is nothing, dressed up and called enough.",
      "{target}, let me tell you what people actually think when you leave the room. They exhale. Not dramatically. Not consciously. Just — the air changes. Something slightly heavy lifts. And they don't talk about it because there's nothing to say. That's the verdict. Not outrage. Just relief.",
      "{target}, you are someone people have rehearsed conversations with. Imagined confrontations. Drafted and deleted. Because something about you generates friction that nobody wants to address directly — so instead they let it accumulate, quietly, invisibly, until it's a wall with your name on it.",
      "{target}, I know what you tell yourself you are. I know what makes you feel righteous and misunderstood and ahead of everyone who doesn't get it yet. I also know that story has been the same for years and the plot hasn't moved. The protagonist hasn't grown. It's the same chapter. You just keep rereading it.",
      "{target}, you have a talent — and I mean this specifically — for being around when things are good and being absent in exactly the ways that matter when they aren't. People have noticed the pattern. They've mapped it. They've just stopped expecting different from you because expecting things from you is a form of self-harm they've given up.",
      "{target}, the thing that makes you genuinely difficult to be around isn't anything dramatic. It's the low-grade wrongness of your presence. Like a sound frequency just outside hearing that makes people tense without knowing why. You are an ambient discomfort. A room that's never quite comfortable. Everyone feels it. Nobody says it.",
      "{target}, you've spent your whole life auditioning for a role nobody's casting. You have the headshots, the monologue, the whole prepared speech — and the casting directors keep looking past you at the door. You've started to wonder if the audition is the point. It isn't. You're just not right for the part.",
      "{target}, here's what makes you genuinely tragic: you're smart enough to sense when you're failing but not brave enough to find out why. So you hover in that space — half-aware, half-defended — and call it depth. It isn't depth. It's the water staying shallow so nothing can drown in it.",
      "{target}, I could describe your flaws all day but the most unforgivable thing about you isn't any of them. It's that somewhere underneath all of it, you could have been something — you had the raw material — and you spent it. All of it. On nothing. On comfort. On smallness. On not trying hard enough to fail properly.",
      "{target}, you are the person in the group photo that people crop out not out of malice but out of habit. Nobody decided to exclude you. You just keep ending up excluded. And one day you'll understand that those two things are the same.",
      "{target}, your laugh is real. Your pain is real. And you use both like currency to buy patience from people who are running out of it. They keep giving it because they remember who you almost were. That's all that's left between you and the silence. The memory of a version of you that still had potential.",
      "{target}, every time you've had the chance to be the person you pretend to be, you've folded. Not spectacularly. Just quietly, reliably, consistently. And the people who witnessed it filed it away without saying a word. That filing cabinet is full. It's been full for a while.",
      "{target}, you know what's genuinely diabolical? The gap between how you describe yourself to new people versus what the people who actually know you would say. That gap is a chasm. It's a crime scene. And you've been committing it for so long you don't even feel the weight of it anymore.",
      "{target}, I have no interest in being cruel to you. Cruelty implies you're worth the effort. What I'm doing is just describing what's there — clearly, precisely, without looking away — and the fact that it hurts this much is not because I'm being vicious. It's because you already knew every word of this and you've been running from it.",
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
