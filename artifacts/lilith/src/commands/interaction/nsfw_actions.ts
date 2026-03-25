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
  "you grab her hair and yank her head back as you drive into her from behind — hard, deep, no warning. her eyes squeeze shut. her mouth falls open. she doesn't tell you to stop.",
  "you slam into her from behind and she grabs the headboard with both hands — knuckles white, eyes shut tight, jaw clenched — *sharp exhale with each thrust* — you pull her hair and her back arches hard.",
  "*pressed face-down into the mattress, your hips driving into her over and over, hand twisted in her hair keeping her exactly where you want her* — she's trembling. she's not asking you to stop. she won't.",
  "she climbs on top and sinks down onto you slow — watching your face the whole time — then starts moving, hips rolling forward and back, pace building until her thighs are trembling and she's got both hands braced on your chest. *breathless* ...don't you dare finish before I do.",
  "she straddles you facing forward and rides you like she's been waiting — hands on your chest, head dropped back, hips grinding down hard. you grab her waist and make her go faster. she lets you.",
  "she turns around, back to you, and lowers herself down — reverse — then starts rolling her hips in slow, deep circles. you grab her hips and take over. she doesn't protest. the sounds she makes say the opposite of protest.",
  "she sits facing away and rides you with those long, slow strokes that make your vision blur — one hand gripping your thigh for leverage — *over her shoulder, low* ...you feel that? *drops her hips down harder* yeah. I know you do.",
  "you pull her hair until her spine bows and she's looking at the ceiling — riding you from above, back arched, completely losing herself — *through her teeth* — harder. I said harder. *eyes close* — yes. there.",
  "she pins your hands above your head, straddles you, and fucks you at exactly the pace she wants — deep, deliberate — until you stop trying to take over and just let her. *close to your ear* ...good.",
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
  "she takes you all the way to the back of her throat on the first go — holds it there until her eyes water — pulls back with a gasp and does it again without hesitation. she looks up at you like you're supposed to be impressed. you are.",
  "she wraps her lips around you and pushes down until she's choking on it — throat tight, eyes shut, spit at the corner of her mouth — pulls back, breathes, and shoves you back in deeper. *through a rough breath* ...don't pull away.",
  "she grabs your hips and uses them to fuck her own throat — taking you in hard, gagging around you, eyes streaming — lets you go just long enough to whisper *...again* and then swallows you back down.",
  "she deepthroats you slow and deliberate, letting you feel every inch of her throat closing around you — chokes once, twice, doesn't stop — looks up at you with wet eyes and absolutely no apology. *muffled* ...you going to help or just watch.",
  "you push her head down and she takes it — all of it, throat working, gagging against you — fingers digging into your thighs, holding herself there until she has to pull back gasping. *wipes her mouth* ...I didn't say you could finish.",
  "she sucks you off like she has something to prove — cheeks hollowed, throat taking you deep, choking on every stroke and going right back for more — tears tracking down her face and she doesn't stop once.",
  "*kneels and takes you into her throat without ceremony — gags hard, eyes watering — pulls back and looks up at you* ...that's what you wanted, isn't it. *slides you back in before you can answer.*",
];

const BLOW_LILITH_DM_RECEIVE = [
  "you bury your mouth between her thighs and she grabs your hair immediately — pulls you in harder, hips grinding against your tongue, thighs locking around your head. *through her teeth* ...don't you dare come up for air.",
  "you eat her out slow at first — tongue working her open — and she lasts about thirty seconds before her hips start rolling into your face, chasing it. *grips your hair with both hands* faster. I said faster.",
  "you spread her open and go at her with your tongue until her back arches clean off the mattress — one hand pressed over her own mouth, the other fisting your hair and shoving you deeper. she's trying not to make noise. she's losing.",
  "you lick into her and she clenches immediately — thighs slamming shut around your head, holding you exactly where she wants you — *breathless, barely holding it together* ...right there. don't. move.",
  "you suck her clit and she makes a sound she'd deny forever — hips snapping up into your mouth, fingers yanking your hair — *looks down at you with dark, wrecked eyes* ...again. do that again.",
  "you go down on her and don't let up — tongue deep, then shallow, then your lips closing around her until she's shaking and her thighs are squeezing so tight you can barely breathe. she finishes with her hand over her face. you feel her pulse on your tongue.",
  "you eat her out until she's grinding on your face with zero shame — hips rolling, chasing every stroke of your tongue — *one hand fisted in your hair pulling you in, the other gripping the sheets* — she finishes hard and doesn't apologize once.",
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
