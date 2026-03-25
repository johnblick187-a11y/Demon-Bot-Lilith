import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set.");
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS user_relations (
      user_id TEXT PRIMARY KEY,
      username TEXT,
      affinity INTEGER NOT NULL DEFAULT 0,
      annoyance INTEGER NOT NULL DEFAULT 0,
      annoyance_locked BOOLEAN NOT NULL DEFAULT FALSE,
      blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
      nsfw_incident_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      nsfw_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      nsfw_channels TEXT[] NOT NULL DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS autoreacts (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      emoji TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS autoreplies (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      trigger TEXT NOT NULL,
      reply TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guild_prefix (
      guild_id TEXT PRIMARY KEY,
      prefix TEXT NOT NULL DEFAULT '!'
    );

    CREATE TABLE IF NOT EXISTS custom_commands (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      effect TEXT NOT NULL,
      locked_prefix TEXT DEFAULT NULL,
      daily_limit BOOLEAN NOT NULL DEFAULT FALSE,
      UNIQUE(guild_id, command_name)
    );

    CREATE TABLE IF NOT EXISTS tracked_bot_prefixes (
      guild_id TEXT NOT NULL,
      bot_user_id TEXT NOT NULL,
      prefix TEXT NOT NULL,
      bot_username TEXT,
      PRIMARY KEY (guild_id, bot_user_id)
    );

    CREATE TABLE IF NOT EXISTS user_bot_prefixes (
      owner_user_id TEXT NOT NULL,
      bot_user_id TEXT NOT NULL,
      prefix TEXT NOT NULL,
      bot_username TEXT,
      PRIMARY KEY (owner_user_id, bot_user_id)
    );

    CREATE TABLE IF NOT EXISTS guild_user_prefixes (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      prefix TEXT NOT NULL,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS custom_command_usage (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      command_name TEXT NOT NULL,
      used_date DATE NOT NULL DEFAULT CURRENT_DATE,
      PRIMARY KEY (guild_id, user_id, command_name)
    );
  `);

  await pool.query(`
    ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS locked_prefix TEXT DEFAULT NULL;
    ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS daily_limit BOOLEAN NOT NULL DEFAULT FALSE;
  `);
}

export async function getRelation(userId: string, username?: string) {
  const res = await pool.query(
    `INSERT INTO user_relations (user_id, username) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET username = COALESCE($2, user_relations.username)
     RETURNING *`,
    [userId, username ?? null]
  );
  return res.rows[0] as {
    user_id: string;
    username: string;
    affinity: number;
    annoyance: number;
    annoyance_locked: boolean;
    blacklisted: boolean;
    nsfw_incident_count: number;
  };
}

export async function updateRelation(
  userId: string,
  delta: { affinity?: number; annoyance?: number }
) {
  const rel = await getRelation(userId);
  if (rel.annoyance_locked && (delta.annoyance ?? 0) > 0) {
    return rel;
  }
  const newAffinity = Math.max(-100, Math.min(100, rel.affinity + (delta.affinity ?? 0)));
  const newAnnoyance = rel.annoyance_locked
    ? 100
    : Math.max(0, Math.min(100, rel.annoyance + (delta.annoyance ?? 0)));
  const res = await pool.query(
    `UPDATE user_relations SET affinity=$1, annoyance=$2 WHERE user_id=$3 RETURNING *`,
    [newAffinity, newAnnoyance, userId]
  );
  return res.rows[0];
}

export async function blacklistUser(userId: string) {
  await pool.query(
    `UPDATE user_relations SET blacklisted=TRUE, annoyance=100, annoyance_locked=TRUE WHERE user_id=$1`,
    [userId]
  );
}

export async function lockAnnoyance(userId: string) {
  await pool.query(
    `UPDATE user_relations SET annoyance=100, annoyance_locked=TRUE WHERE user_id=$1`,
    [userId]
  );
}

export async function getGuildSettings(guildId: string) {
  const res = await pool.query(
    `INSERT INTO guild_settings (guild_id) VALUES ($1)
     ON CONFLICT (guild_id) DO NOTHING RETURNING *`,
    [guildId]
  );
  if (res.rows.length === 0) {
    const r2 = await pool.query(`SELECT * FROM guild_settings WHERE guild_id=$1`, [guildId]);
    return r2.rows[0];
  }
  return res.rows[0];
}

export async function setNsfwEnabled(guildId: string, enabled: boolean) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id, nsfw_enabled) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET nsfw_enabled=$2`,
    [guildId, enabled]
  );
}

export async function addNsfwChannel(guildId: string, channelId: string) {
  await pool.query(
    `UPDATE guild_settings SET nsfw_channels = array_append(nsfw_channels, $2) WHERE guild_id=$1`,
    [guildId, channelId]
  );
}

export async function removeNsfwChannel(guildId: string, channelId: string) {
  await pool.query(
    `UPDATE guild_settings SET nsfw_channels = array_remove(nsfw_channels, $2) WHERE guild_id=$1`,
    [guildId, channelId]
  );
}

export async function addAutoreact(guildId: string, trigger: string, emoji: string) {
  await pool.query(
    `INSERT INTO autoreacts (guild_id, trigger, emoji) VALUES ($1, $2, $3)`,
    [guildId, trigger, emoji]
  );
}

export async function getAutoreacts(guildId: string) {
  const res = await pool.query(`SELECT * FROM autoreacts WHERE guild_id=$1`, [guildId]);
  return res.rows as { id: number; guild_id: string; trigger: string; emoji: string }[];
}

export async function addAutoreply(guildId: string, trigger: string, reply: string) {
  await pool.query(
    `INSERT INTO autoreplies (guild_id, trigger, reply) VALUES ($1, $2, $3)`,
    [guildId, trigger, reply]
  );
}

export async function getAutoreplies(guildId: string) {
  const res = await pool.query(`SELECT * FROM autoreplies WHERE guild_id=$1`, [guildId]);
  return res.rows as { id: number; guild_id: string; trigger: string; reply: string }[];
}

export async function addWarning(guildId: string, userId: string, reason: string) {
  await pool.query(
    `INSERT INTO warnings (guild_id, user_id, reason) VALUES ($1, $2, $3)`,
    [guildId, userId, reason]
  );
}

export async function getWarnings(guildId: string, userId: string) {
  const res = await pool.query(
    `SELECT * FROM warnings WHERE guild_id=$1 AND user_id=$2 ORDER BY created_at DESC`,
    [guildId, userId]
  );
  return res.rows;
}

export async function getGuildPrefix(guildId: string): Promise<string> {
  const res = await pool.query(
    `INSERT INTO guild_prefix (guild_id, prefix) VALUES ($1, '!')
     ON CONFLICT (guild_id) DO NOTHING RETURNING prefix`,
    [guildId]
  );
  if (res.rows.length > 0) return res.rows[0].prefix;
  const r2 = await pool.query(`SELECT prefix FROM guild_prefix WHERE guild_id=$1`, [guildId]);
  return r2.rows[0]?.prefix ?? "!";
}

export async function setGuildPrefix(guildId: string, prefix: string): Promise<void> {
  await pool.query(
    `INSERT INTO guild_prefix (guild_id, prefix) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET prefix=$2`,
    [guildId, prefix]
  );
}

export async function getTrackedBotPrefix(
  guildId: string,
  botUserId: string
): Promise<{ prefix: string; bot_username: string | null } | null> {
  const res = await pool.query(
    `SELECT prefix, bot_username FROM tracked_bot_prefixes WHERE guild_id=$1 AND bot_user_id=$2`,
    [guildId, botUserId]
  );
  return res.rows[0] ?? null;
}

export async function setTrackedBotPrefix(
  guildId: string,
  botUserId: string,
  prefix: string,
  botUsername?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO tracked_bot_prefixes (guild_id, bot_user_id, prefix, bot_username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guild_id, bot_user_id) DO UPDATE SET prefix=$3, bot_username=COALESCE($4, tracked_bot_prefixes.bot_username)`,
    [guildId, botUserId, prefix, botUsername ?? null]
  );
}

export async function getGuildUserPrefix(guildId: string, userId: string): Promise<string | null> {
  const res = await pool.query(
    `SELECT prefix FROM guild_user_prefixes WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  return res.rows[0]?.prefix ?? null;
}

export async function setGuildUserPrefix(guildId: string, userId: string, prefix: string): Promise<void> {
  await pool.query(
    `INSERT INTO guild_user_prefixes (guild_id, user_id, prefix) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET prefix=$3`,
    [guildId, userId, prefix]
  );
}

export async function getUserBotPrefix(
  ownerUserId: string,
  botUserId: string
): Promise<{ prefix: string; bot_username: string | null } | null> {
  const res = await pool.query(
    `SELECT prefix, bot_username FROM user_bot_prefixes WHERE owner_user_id=$1 AND bot_user_id=$2`,
    [ownerUserId, botUserId]
  );
  return res.rows[0] ?? null;
}

export async function setUserBotPrefix(
  ownerUserId: string,
  botUserId: string,
  prefix: string,
  botUsername?: string
): Promise<void> {
  await pool.query(
    `INSERT INTO user_bot_prefixes (owner_user_id, bot_user_id, prefix, bot_username)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (owner_user_id, bot_user_id) DO UPDATE SET prefix=$3, bot_username=COALESCE($4, user_bot_prefixes.bot_username)`,
    [ownerUserId, botUserId, prefix, botUsername ?? null]
  );
}

export async function addCustomCommand(guildId: string, name: string, effect: string): Promise<void> {
  await pool.query(
    `INSERT INTO custom_commands (guild_id, command_name, effect) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, command_name) DO UPDATE SET effect=$3`,
    [guildId, name.toLowerCase(), effect]
  );
}

export async function addLockedCustomCommand(
  guildId: string,
  name: string,
  effect: string,
  lockedPrefix: string
): Promise<void> {
  await pool.query(
    `INSERT INTO custom_commands (guild_id, command_name, effect, locked_prefix, daily_limit)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (guild_id, command_name) DO UPDATE SET effect=$3, locked_prefix=$4, daily_limit=TRUE`,
    [guildId, name.toLowerCase(), effect, lockedPrefix]
  );
}

export async function getCustomCommands(
  guildId: string
): Promise<{ command_name: string; effect: string; locked_prefix: string | null; daily_limit: boolean }[]> {
  const res = await pool.query(
    `SELECT command_name, effect, locked_prefix, daily_limit FROM custom_commands WHERE guild_id=$1`,
    [guildId]
  );
  return res.rows;
}

export async function getCustomCommand(guildId: string, name: string): Promise<string | null> {
  const res = await pool.query(
    `SELECT effect FROM custom_commands WHERE guild_id=$1 AND command_name=$2`,
    [guildId, name.toLowerCase()]
  );
  return res.rows[0]?.effect ?? null;
}

export async function getCustomCommandFull(
  guildId: string,
  name: string
): Promise<{ effect: string; locked_prefix: string | null; daily_limit: boolean } | null> {
  const res = await pool.query(
    `SELECT effect, locked_prefix, daily_limit FROM custom_commands WHERE guild_id=$1 AND command_name=$2`,
    [guildId, name.toLowerCase()]
  );
  return res.rows[0] ?? null;
}

export async function canUseCustomCommandToday(
  guildId: string,
  userId: string,
  commandName: string
): Promise<boolean> {
  const res = await pool.query(
    `SELECT used_date FROM custom_command_usage
     WHERE guild_id=$1 AND user_id=$2 AND command_name=$3 AND used_date = CURRENT_DATE`,
    [guildId, userId, commandName]
  );
  return res.rows.length === 0;
}

export async function recordCustomCommandUsage(
  guildId: string,
  userId: string,
  commandName: string
): Promise<void> {
  await pool.query(
    `INSERT INTO custom_command_usage (guild_id, user_id, command_name, used_date)
     VALUES ($1, $2, $3, CURRENT_DATE)
     ON CONFLICT (guild_id, user_id, command_name) DO UPDATE SET used_date = CURRENT_DATE`,
    [guildId, userId, commandName]
  );
}
