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
      nsfw_incident_count INTEGER NOT NULL DEFAULT 0,
      enemy BOOLEAN NOT NULL DEFAULT FALSE,
      last_annoyance_update TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS guild_settings (
      guild_id TEXT PRIMARY KEY,
      nsfw_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      nsfw_channels TEXT[] NOT NULL DEFAULT '{}',
      chat_enabled BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS log_channels (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL
    );

    ALTER TABLE guild_settings ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT TRUE;

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
      month_key TEXT NOT NULL DEFAULT TO_CHAR(CURRENT_DATE, 'YYYY-MM'),
      use_count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (guild_id, user_id, command_name)
    );
  `);

  await pool.query(`
    ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS locked_prefix TEXT DEFAULT NULL;
    ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS daily_limit BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS effect_type TEXT NOT NULL DEFAULT 'text';
    ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS embed_title TEXT DEFAULT NULL;
    ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS embed_color TEXT DEFAULT NULL;
    ALTER TABLE custom_commands ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT NULL;
    ALTER TABLE custom_command_usage ADD COLUMN IF NOT EXISTS month_key TEXT;
    ALTER TABLE custom_command_usage ADD COLUMN IF NOT EXISTS use_count INTEGER NOT NULL DEFAULT 1;
    UPDATE custom_command_usage SET month_key = TO_CHAR(used_date, 'YYYY-MM') WHERE month_key IS NULL;
    ALTER TABLE user_relations ADD COLUMN IF NOT EXISTS enemy BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE user_relations ADD COLUMN IF NOT EXISTS last_annoyance_update TIMESTAMPTZ NOT NULL DEFAULT NOW();
  `);

  const { OWNER_ID, LORE_ENEMIES } = await import("./constants.js");

  await pool.query(`
    INSERT INTO user_relations (user_id, username, affinity, annoyance)
    VALUES ($1, 'tweakbrazy', 100, 0)
    ON CONFLICT (user_id) DO NOTHING
  `, [OWNER_ID]);

  for (const enemy of LORE_ENEMIES) {
    await pool.query(`
      INSERT INTO user_relations (user_id, username, affinity, annoyance, annoyance_locked, enemy)
      VALUES ($1, $2, -100, 100, TRUE, TRUE)
      ON CONFLICT (user_id) DO UPDATE SET enemy = TRUE, annoyance_locked = TRUE, affinity = -100, annoyance = 100
    `, [enemy.id, enemy.username]);
  }
}

export async function getRelation(userId: string, username?: string) {
  const res = await pool.query(
    `INSERT INTO user_relations (user_id, username) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET username = COALESCE($2, user_relations.username)
     RETURNING *`,
    [userId, username ?? null]
  );
  const row = res.rows[0];

  if (!row.annoyance_locked && row.annoyance > 0) {
    const hoursSince = (Date.now() - new Date(row.last_annoyance_update).getTime()) / 3600000;
    if (hoursSince >= 6) {
      const decay = Math.min(row.annoyance, Math.floor(hoursSince / 6) * 3);
      if (decay > 0) {
        await pool.query(
          `UPDATE user_relations SET annoyance = GREATEST(0, annoyance - $1), last_annoyance_update = NOW() WHERE user_id = $2`,
          [decay, userId]
        );
        row.annoyance = Math.max(0, row.annoyance - decay);
      }
    }
  }

  return row as {
    user_id: string;
    username: string;
    affinity: number;
    annoyance: number;
    annoyance_locked: boolean;
    blacklisted: boolean;
    nsfw_incident_count: number;
    enemy: boolean;
    last_annoyance_update: string;
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
  const annoyanceChanged = (delta.annoyance ?? 0) !== 0;
  const newAnnoyance = rel.annoyance_locked
    ? 100
    : Math.max(0, Math.min(100, rel.annoyance + (delta.annoyance ?? 0)));
  const res = await pool.query(
    `UPDATE user_relations SET affinity=$1, annoyance=$2, last_annoyance_update = CASE WHEN $4 THEN NOW() ELSE last_annoyance_update END WHERE user_id=$3 RETURNING *`,
    [newAffinity, newAnnoyance, userId, annoyanceChanged]
  );
  return res.rows[0];
}

export async function markEnemy(userId: string, isEnemy: boolean): Promise<void> {
  await pool.query(
    `UPDATE user_relations SET enemy=$2, annoyance=CASE WHEN $2 THEN 100 ELSE annoyance END, affinity=CASE WHEN $2 THEN -100 ELSE affinity END WHERE user_id=$1`,
    [userId, isEnemy]
  );
  if (isEnemy) {
    await pool.query(
      `UPDATE user_relations SET annoyance_locked=TRUE WHERE user_id=$1`,
      [userId]
    );
  }
}

export async function getLilithMoodData(): Promise<{ avgAnnoyance: number; enemyCount: number; userCount: number }> {
  const res = await pool.query(
    `SELECT
       COALESCE(AVG(annoyance), 0) as avg_annoyance,
       COUNT(*) FILTER (WHERE enemy = TRUE) as enemy_count,
       COUNT(*) as user_count
     FROM user_relations WHERE blacklisted = FALSE`
  );
  return {
    avgAnnoyance: Math.round(parseFloat(res.rows[0].avg_annoyance)),
    enemyCount: parseInt(res.rows[0].enemy_count, 10),
    userCount: parseInt(res.rows[0].user_count, 10),
  };
}

export async function getEnemies(): Promise<{ user_id: string; username: string }[]> {
  const res = await pool.query(
    `SELECT user_id, username FROM user_relations WHERE enemy = TRUE ORDER BY username`
  );
  return res.rows;
}

export async function unblacklistUser(userId: string): Promise<boolean> {
  const res = await pool.query(
    `UPDATE user_relations SET blacklisted=FALSE, annoyance=0, annoyance_locked=FALSE, nsfw_incident_count=0 WHERE user_id=$1`,
    [userId]
  );
  return (res.rowCount ?? 0) > 0;
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

export async function getChatEnabled(guildId: string): Promise<boolean> {
  const res = await pool.query(
    `INSERT INTO guild_settings (guild_id) VALUES ($1)
     ON CONFLICT (guild_id) DO NOTHING`,
    [guildId]
  );
  const r = await pool.query(
    `SELECT chat_enabled FROM guild_settings WHERE guild_id=$1`,
    [guildId]
  );
  return r.rows[0]?.chat_enabled ?? true;
}

export async function setChatEnabled(guildId: string, enabled: boolean) {
  await pool.query(
    `INSERT INTO guild_settings (guild_id, chat_enabled) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET chat_enabled=$2`,
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

export async function removeAutoreact(guildId: string, trigger: string): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM autoreacts WHERE guild_id=$1 AND trigger=$2`,
    [guildId, trigger.toLowerCase()]
  );
  return (res.rowCount ?? 0) > 0;
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

export async function removeAutoreply(guildId: string, trigger: string): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM autoreplies WHERE guild_id=$1 AND trigger=$2`,
    [guildId, trigger.toLowerCase()]
  );
  return (res.rowCount ?? 0) > 0;
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

export interface CustomCommandConfig {
  effect_type: "text" | "embed" | "action";
  embed_title?: string | null;
  embed_color?: string | null;
  image_url?: string | null;
}

export async function addLockedCustomCommand(
  guildId: string,
  name: string,
  effect: string,
  lockedPrefix: string,
  config: CustomCommandConfig = { effect_type: "text" }
): Promise<void> {
  await pool.query(
    `INSERT INTO custom_commands (guild_id, command_name, effect, locked_prefix, daily_limit, effect_type, embed_title, embed_color, image_url)
     VALUES ($1, $2, $3, $4, FALSE, $5, $6, $7, $8)
     ON CONFLICT (guild_id, command_name) DO UPDATE
       SET effect=$3, locked_prefix=$4, daily_limit=FALSE,
           effect_type=$5, embed_title=$6, embed_color=$7, image_url=$8`,
    [guildId, name.toLowerCase(), effect, lockedPrefix,
     config.effect_type, config.embed_title ?? null, config.embed_color ?? null, config.image_url ?? null]
  );
}

export async function getCustomCommands(guildId: string): Promise<{
  command_name: string;
  effect: string;
  locked_prefix: string | null;
  daily_limit: boolean;
  effect_type: string;
  embed_title: string | null;
  embed_color: string | null;
  image_url: string | null;
}[]> {
  const res = await pool.query(
    `SELECT command_name, effect, locked_prefix, daily_limit, effect_type, embed_title, embed_color, image_url
     FROM custom_commands WHERE guild_id=$1`,
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
    `SELECT use_count, month_key FROM custom_command_usage
     WHERE guild_id=$1 AND user_id=$2 AND command_name=$3`,
    [guildId, userId, commandName]
  );
  if (res.rows.length === 0) return true;
  const { use_count, month_key } = res.rows[0];
  const currentMonth = new Date().toISOString().slice(0, 7);
  if (month_key !== currentMonth) return true;
  return parseInt(use_count, 10) < 2;
}

export async function recordCustomCommandUsage(
  guildId: string,
  userId: string,
  commandName: string
): Promise<void> {
  const currentMonth = new Date().toISOString().slice(0, 7);
  await pool.query(
    `INSERT INTO custom_command_usage (guild_id, user_id, command_name, used_date, month_key, use_count)
     VALUES ($1, $2, $3, CURRENT_DATE, $4, 1)
     ON CONFLICT (guild_id, user_id, command_name) DO UPDATE SET
       use_count = CASE
         WHEN custom_command_usage.month_key = $4 THEN custom_command_usage.use_count + 1
         ELSE 1
       END,
       month_key = $4,
       used_date = CURRENT_DATE`,
    [guildId, userId, commandName, currentMonth]
  );
}
