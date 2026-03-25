import { SlashCommandBuilder, CommandInteraction, Client } from "discord.js";
import { getRelation, updateRelation, getGuildSettings, blacklistUser, lockAnnoyance } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

const SMASH_ACTS = [
  "{actor} bends {target} over the server table. No further details needed.",
  "{target} finds themselves pinned to the wall by {actor}. Willingly.",
  "{actor} and {target} disappear into a private channel. Everyone knows what's happening.",
  "{actor} drags {target} away from the crowd. Both return looking disheveled.",
  "{actor} whispers something in {target}'s ear. {target} goes scarlet. They leave together.",
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

async function isNsfwAllowed(guildId: string, channelId: string): Promise<boolean> {
  const settings = await getGuildSettings(guildId);
  return settings.nsfw_enabled || (settings.nsfw_channels && settings.nsfw_channels.includes(channelId));
}

async function handleNsfwOnLilith(
  interaction: CommandInteraction,
  client: Client
): Promise<boolean> {
  const target = (interaction.options as any).getUser("user", true);
  if (target.id === client.user?.id) {
    const userId = interaction.user.id;

    if (userId === OWNER_ID) {
      return false;
    }

    const rel = await getRelation(userId, interaction.user.username);
    const incidentCount = rel.nsfw_incident_count + 1;

    await interaction.reply({
      content: `Did you just try to use an NSFW command on **me**? Bold of you to assume I'd allow that. Absolutely not.\n\n*tweakbrazy has been notified of your audacity.*`,
      ephemeral: false,
    });

    await updateRelation(userId, { annoyance: 50 });

    await lockAnnoyanceAndNotify(userId, incidentCount, interaction, client);

    return true;
  }
  return false;
}

async function lockAnnoyanceAndNotify(
  userId: string,
  incidentCount: number,
  interaction: CommandInteraction,
  client: Client
) {
  const pool = await import("../../lib/db.js");

  await pool.pool.query(
    `UPDATE user_relations SET nsfw_incident_count = nsfw_incident_count + 1 WHERE user_id = $1`,
    [userId]
  );

  try {
    const owner = await client.users.fetch(OWNER_ID);
    const guild = interaction.guild;
    const member = guild?.members.cache.get(userId);
    await owner.send(
      `⚠️ **NSFW Incident Alert**\n**User:** ${interaction.user.username} (${userId})\n**Incident #${incidentCount}**\n**Server:** ${guild?.name ?? "DM"}\n\n${
        incidentCount >= 2
          ? "Second offense — annoyance locked at 100 and user BLACKLISTED."
          : "First offense — 50 annoyance points added."
      }`
    );
  } catch {
  }

  if (incidentCount >= 2) {
    await blacklistUser(userId);
    await interaction.followUp({
      content: `Second offense. You're blacklisted. Permanently. Don't touch my commands again.`,
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
  if (!interaction.guild) return interaction.reply({ content: "Server only.", ephemeral: true });

  const nsfw = await isNsfwAllowed(interaction.guild.id, interaction.channelId);
  if (!nsfw)
    return interaction.reply({ content: "NSFW commands aren't enabled here. Enable them first.", ephemeral: true });

  const blocked = await handleNsfwOnLilith(interaction, client);
  if (blocked) return;

  const target = (interaction.options as any).getUser("user", true);
  const userId = interaction.user.id;

  const rel = await getRelation(userId, interaction.user.username);
  if (rel.blacklisted) return interaction.reply({ content: "You're blacklisted. You don't get commands.", ephemeral: true });

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
  if (!interaction.guild) return interaction.reply({ content: "Server only.", ephemeral: true });

  const nsfw = await isNsfwAllowed(interaction.guild.id, interaction.channelId);
  if (!nsfw)
    return interaction.reply({ content: "NSFW commands aren't enabled here.", ephemeral: true });

  const blocked = await handleNsfwOnLilith(interaction, client);
  if (blocked) return;

  const target = (interaction.options as any).getUser("user", true);
  const userId = interaction.user.id;

  const rel = await getRelation(userId, interaction.user.username);
  if (rel.blacklisted) return interaction.reply({ content: "You're blacklisted.", ephemeral: true });

  const isAtoB = Math.random() > 0.5;
  const pool = isAtoB ? BLOW_ACTS_AB : BLOW_ACTS_BA;
  const act = pool[Math.floor(Math.random() * pool.length)]
    .replace("{actor}", `**${interaction.user.username}**`)
    .replace("{target}", `**${target.username}**`);

  await interaction.reply(`💋 ${act}`);
}
