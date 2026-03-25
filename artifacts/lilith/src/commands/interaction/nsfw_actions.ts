import { SlashCommandBuilder, CommandInteraction, Client, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { getRelation, updateRelation, getGuildSettings, blacklistUser } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

async function fetchGif(query: string): Promise<string | null> {
  try {
    const url = `https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=LIVDSRZULELA&contentfilter=off&limit=20&media_filter=minimal`;
    const res = await fetch(url);
    const data = await res.json() as any;
    const results = data?.results;
    if (!results?.length) return null;
    const item = results[Math.floor(Math.random() * results.length)];
    return item?.media?.[0]?.gif?.url ?? null;
  } catch {
    return null;
  }
}

async function replyWithGif(interaction: CommandInteraction, text: string, gifQuery: string) {
  const gifUrl = await fetchGif(gifQuery);
  if (gifUrl) {
    const embed = new EmbedBuilder().setImage(gifUrl).setColor(0x1a0010);
    await interaction.reply({ content: text, embeds: [embed] });
  } else {
    await interaction.reply(text);
  }
}

const SMASH_ACTS = [
  "{actor} bends {target} over and fucks them from behind, one hand fisted in their hair, the other gripping their hip hard enough to bruise. {target} is not complaining.",
  "{actor} pins {target} against the wall and slides into them slow — then not slow at all. {target}'s nails drag down the wall.",
  "{actor} pulls {target} into their lap and rides them until {target} can't form a coherent sentence. Both of them are out of breath.",
  "{actor} spreads {target} out and takes their time — mouth first, then hands, then everything else. {target} stops pretending they're not into it about halfway through.",
  "{actor} fucks {target} deep and steady, whispering something in their ear that makes {target}'s whole body shudder. They finish together. Loudly.",
  "{target} ends up on their back with {actor} between their legs, hitting every spot that matters. The sounds {target} makes are not quiet.",
  "{actor} and {target} go at it hard enough that something falls off the shelf. Neither of them notices. Neither of them stops.",
];

const SMASH_LILITH_DM = [
  "*lets you bend her over, fingers curling into the sheets* ...don't stop. and don't you dare go easy on me.",
  "*arches her back into you as you push in deep* ...fine. *breathes out slow* you win. now make it worth it.",
  "*reaches back and grabs your wrist, keeps you moving* harder. I said harder. *looks back over her shoulder with dark eyes* there.",
  "you push in from behind and she goes quiet — then lets out a sharp breath — *grips the headboard* ...I hate how good that feels.",
  "*pressed against the wall with your hips against hers* ...you feel that? *tilts her head back against your shoulder* yeah. just like that.",
  "*legs spread, taking all of you, nails dragging down your arm* don't slow down. I'll be angry if you slow down.",
  "*back arching off the mattress as you drive into her* ...god. *exhales through her teeth* only you get this. remember that.",
];

const BLOW_ACTS_AB = [
  "{actor} wraps their lips around {target}'s cock and takes it deep — no hesitation, no warmup. {target} grabs their hair and doesn't let go.",
  "{actor} goes down on {target}, tongue working slow circles until {target}'s thighs are shaking and their head drops back.",
  "{actor} takes {target} all the way to the back of their throat and holds it there. {target} makes a sound they'll deny later.",
  "{actor} gets on their knees and sucks {target} off slow and deliberate, watching their face the whole time. {target} can't look away.",
  "{actor} deepthroats {target} like they've been thinking about it, hands pinning {target}'s hips down. {target} grips the edge of whatever's nearest.",
];

const BLOW_ACTS_BA = [
  "{target} buries their face between {actor}'s thighs and doesn't come up for air until {actor} is shaking.",
  "{actor} grabs {target}'s head and pushes them down — {target} takes the hint, tongue first, and {actor}'s eyes roll back.",
  "{target} eats {actor} out slow, then faster when {actor} stops trying to stay quiet.",
  "{actor} sits on {target}'s face and grinds down while {target}'s hands grip their thighs and hold on.",
  "{target} goes down on {actor} with an enthusiasm that makes {actor} forget what they were doing. {actor} finishes hard.",
];

const BLOW_LILITH_DM_GIVE = [
  "*drops to her knees and takes you in her mouth without warning — deep, deliberate, no hesitation* ...you're not going anywhere.",
  "*wraps her lips around you and takes it slow — tongue tracing the underside all the way down* only you get this. remember that.",
  "*hollows her cheeks and sucks you off with those heavy, dark eyes looking up at you the whole time* ...don't look away.",
  "*takes you to the back of her throat and holds it — fingers digging into your thighs* ...there. *pulls back slow* ...again?",
  "*strokes you once, then her mouth replaces her hand — warm and wet and absolutely merciless* you'll be thinking about this later.",
];

const BLOW_LILITH_DM_RECEIVE = [
  "*thighs close around your head the second your mouth finds her* ...don't stop. *breathes out sharp* I mean it, don't you dare stop.",
  "*hips roll into your tongue slow, then less slow* ...fine. *grips your hair* right there. don't move.",
  "*arches her back hard as you eat her out, one hand pressed over her own mouth* ...fuck. *the word barely makes it out*",
  "*looks down at you between her legs with heavy, dark eyes* ...good. *fingers curl in your hair and pull you closer* deeper.",
  "*shudders once, then again, thighs trembling against your shoulders* ...you made your point. *breathes through her teeth* now finish it.",
];

async function isNsfwAllowed(guildId: string, channelId: string): Promise<boolean> {
  const settings = await getGuildSettings(guildId);
  return settings.nsfw_enabled || (settings.nsfw_channels && settings.nsfw_channels.includes(channelId));
}

async function banFromAllGuilds(userId: string, username: string, client: Client): Promise<number> {
  let banned = 0;
  for (const guild of client.guilds.cache.values()) {
    try {
      const me = guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.BanMembers)) continue;
      await guild.bans.create(userId, { reason: `NSFW command used against Lilith by ${username}. Automatic ban.` });
      banned++;
    } catch {}
  }
  return banned;
}

async function handleNsfwOnLilith(
  interaction: CommandInteraction,
  client: Client
): Promise<boolean> {
  const target = (interaction.options as any).getUser("user", true);
  if (target.id !== client.user?.id) return false;

  const userId = interaction.user.id;
  const inDM = !interaction.guild;

  if (userId === OWNER_ID) {
    if (inDM) return false;
    await interaction.reply({
      content: `Not here. You know where.`,
      ephemeral: true,
    });
    return true;
  }

  const rel = await getRelation(userId, interaction.user.username);
  const incidentCount = rel.nsfw_incident_count + 1;

  await interaction.reply({
    content: `You just tried to use an NSFW command on **me**.\n\nThat was a mistake.`,
    ephemeral: false,
  });

  await updateRelation(userId, { annoyance: 50 });

  const banned = await banFromAllGuilds(userId, interaction.user.username, client);

  await lockAnnoyanceAndNotify(userId, incidentCount, interaction, client, banned);

  return true;
}

async function lockAnnoyanceAndNotify(
  userId: string,
  incidentCount: number,
  interaction: CommandInteraction,
  client: Client,
  bannedCount: number = 0
) {
  const { pool } = await import("../../lib/db.js");

  await pool.query(
    `UPDATE user_relations SET nsfw_incident_count = nsfw_incident_count + 1 WHERE user_id = $1`,
    [userId]
  );

  try {
    const owner = await client.users.fetch(OWNER_ID);
    const guild = interaction.guild;
    await owner.send(
      `⚠️ **NSFW Incident — Lilith Targeted**\n` +
      `**User:** ${interaction.user.username} (${userId})\n` +
      `**Incident #${incidentCount}**\n` +
      `**Server:** ${guild?.name ?? "DM"}\n` +
      `**Banned from:** ${bannedCount} server${bannedCount !== 1 ? "s" : ""}\n\n` +
      `${incidentCount >= 2 ? "Second offense — user BLACKLISTED." : "First offense."}`
    );
  } catch {}

  if (incidentCount >= 2) {
    await blacklistUser(userId);
    await interaction.followUp({
      content: `Second offense. You're blacklisted. Permanently.`,
      ephemeral: false,
    });
  }
}

export const smashData = new SlashCommandBuilder()
  .setName("smash")
  .setDescription("Have your way with another user (NSFW)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Target user").setRequired(true)
  );

export async function executeSmash(interaction: CommandInteraction, client: Client) {
  const target = (interaction.options as any).getUser("user", true);
  const userId = interaction.user.id;

  if (target.id === client.user?.id) {
    const blocked = await handleNsfwOnLilith(interaction, client);
    if (blocked) return;
    const act = SMASH_LILITH_DM[Math.floor(Math.random() * SMASH_LILITH_DM.length)];
    return replyWithGif(interaction, `🖤 ${act}`, "hentai doggystyle");
  }

  if (interaction.guild) {
    const nsfw = await isNsfwAllowed(interaction.guild.id, interaction.channelId);
    if (!nsfw) {
      return interaction.reply({ content: "NSFW commands aren't enabled here. Enable them first.", flags: 64 });
    }
  }

  const rel = await getRelation(userId, interaction.user.username);
  if (rel.blacklisted) return interaction.reply({ content: "You're blacklisted. You don't get commands.", flags: 64 });

  const act = SMASH_ACTS[Math.floor(Math.random() * SMASH_ACTS.length)]
    .replace("{actor}", `**${interaction.user.username}**`)
    .replace("{target}", `**${target.username}**`);

  await replyWithGif(interaction, `🔥 ${act}`, "hentai sex");
}

export const blowData = new SlashCommandBuilder()
  .setName("blow")
  .setDescription("Give or receive from another user (NSFW)")
  .addUserOption((opt) =>
    opt.setName("user").setDescription("Target user").setRequired(true)
  );

export async function executeBlow(interaction: CommandInteraction, client: Client) {
  const target = (interaction.options as any).getUser("user", true);
  const userId = interaction.user.id;

  if (target.id === client.user?.id) {
    const blocked = await handleNsfwOnLilith(interaction, client);
    if (blocked) return;
    const giving = Math.random() > 0.5;
    const pool = giving ? BLOW_LILITH_DM_GIVE : BLOW_LILITH_DM_RECEIVE;
    const act = pool[Math.floor(Math.random() * pool.length)];
    const gifQuery = giving ? "hentai blowjob deepthroat" : "hentai cunnilingus";
    return replyWithGif(interaction, `🖤 ${act}`, gifQuery);
  }

  if (interaction.guild) {
    const nsfw = await isNsfwAllowed(interaction.guild.id, interaction.channelId);
    if (!nsfw) {
      return interaction.reply({ content: "NSFW commands aren't enabled here.", flags: 64 });
    }
  }

  const rel = await getRelation(userId, interaction.user.username);
  if (rel.blacklisted) return interaction.reply({ content: "You're blacklisted.", flags: 64 });

  const isAtoB = Math.random() > 0.5;
  const pool = isAtoB ? BLOW_ACTS_AB : BLOW_ACTS_BA;
  const act = pool[Math.floor(Math.random() * pool.length)]
    .replace("{actor}", `**${interaction.user.username}**`)
    .replace("{target}", `**${target.username}**`);

  await replyWithGif(interaction, `💋 ${act}`, "hentai oral");
}
