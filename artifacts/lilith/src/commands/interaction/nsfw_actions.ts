import { SlashCommandBuilder, CommandInteraction, Client, PermissionFlagsBits } from "discord.js";
import { getRelation, updateRelation, getGuildSettings, blacklistUser } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

const SMASH_ACTS = [
  "{actor} bends {target} over the server table. No further details needed.",
  "{target} finds themselves pinned to the wall by {actor}. Willingly.",
  "{actor} and {target} disappear into a private channel. Everyone knows what's happening.",
  "{actor} drags {target} away from the crowd. Both return looking disheveled.",
  "{actor} whispers something in {target}'s ear. {target} goes scarlet. They leave together.",
];

const SMASH_LILITH_DM = [
  "*lets you.* Don't make it weird. ...weirder.",
  "Fine. But only because it's you. And only here.",
  "*says nothing. Just pulls you closer.*",
  "You know I only do this for you. Don't forget that.",
  "*pins you against the wall* ...you were saying?",
];

const BLOW_ACTS_AB = [
  "{actor} drops to their knees for {target}. That's all that needs to be said.",
  "{target} pushes {actor}'s head down. They comply.",
  "{actor} does things with their mouth that {target} will remember for a while.",
];

const BLOW_ACTS_BA = [
  "{target} returns the favor to {actor}. Enthusiastically.",
  "{actor} leans back while {target} takes care of things. Efficient.",
  "{target} goes down on {actor}. Everyone else pretends not to notice.",
];

const BLOW_LILITH_DM = [
  "*drops to her knees without a word. Just for you.*",
  "Only you get this. Remember that.",
  "*looks up at you* ...don't make me say it out loud.",
  "Fine. *kneels* You never saw this side of me.",
  "*pulls you down with her* — you started this.",
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
    return interaction.reply(`🖤 ${act}`);
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

  await interaction.reply(`🔥 ${act}`);
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
    const act = BLOW_LILITH_DM[Math.floor(Math.random() * BLOW_LILITH_DM.length)];
    return interaction.reply(`🖤 ${act}`);
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

  await interaction.reply(`💋 ${act}`);
}
