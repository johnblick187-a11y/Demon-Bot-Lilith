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

    CREATE TABLE IF NOT EXISTS user_levels (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 0,
      total_messages INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS level_roles (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      level INTEGER NOT NULL,
      role_id TEXT NOT NULL,
      UNIQUE(guild_id, level)
    );

    CREATE TABLE IF NOT EXISTS level_channels (
      guild_id TEXT PRIMARY KEY,
      channel_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invite_uses (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      inviter_id TEXT NOT NULL,
      invitee_id TEXT NOT NULL,
      invite_code TEXT NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      still_in_server BOOLEAN NOT NULL DEFAULT TRUE
    );

    CREATE TABLE IF NOT EXISTS lockdown_overwrites (
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      allow TEXT NOT NULL DEFAULT '0',
      deny TEXT NOT NULL DEFAULT '0',
      PRIMARY KEY (guild_id, channel_id)
    );

    CREATE TABLE IF NOT EXISTS lockdown_state (
      guild_id TEXT PRIMARY KEY,
      active BOOLEAN NOT NULL DEFAULT FALSE,
      reason TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS anti_nuke_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      channel_threshold INTEGER NOT NULL DEFAULT 3,
      ban_threshold INTEGER NOT NULL DEFAULT 5,
      role_threshold INTEGER NOT NULL DEFAULT 3,
      window_seconds INTEGER NOT NULL DEFAULT 10,
      action TEXT NOT NULL DEFAULT 'ban'
    );

    CREATE TABLE IF NOT EXISTS anti_raid_settings (
      guild_id TEXT PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      join_threshold INTEGER NOT NULL DEFAULT 10,
      window_seconds INTEGER NOT NULL DEFAULT 30,
      action TEXT NOT NULL DEFAULT 'lockdown'
    );

    CREATE TABLE IF NOT EXISTS server_backups (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      data JSONB NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reaction_roles (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      role_id TEXT NOT NULL,
      UNIQUE(guild_id, message_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS user_autoreacts (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      UNIQUE(guild_id, user_id, emoji)
    );

    CREATE TABLE IF NOT EXISTS user_autoreplies (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reply TEXT NOT NULL,
      UNIQUE(guild_id, user_id, reply)
    );

    CREATE TABLE IF NOT EXISTS bot_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conversation_history (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_conv_hist_lookup
      ON conversation_history(guild_id, user_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS conversation_summaries (
      guild_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      summary TEXT NOT NULL,
      messages_covered INTEGER NOT NULL DEFAULT 0,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (guild_id, user_id)
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

    CREATE TABLE IF NOT EXISTS automod_rules (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      type TEXT NOT NULL,
      config JSONB NOT NULL DEFAULT '{}',
      action TEXT NOT NULL DEFAULT 'delete',
      action_duration INTEGER,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS automod_words (
      id SERIAL PRIMARY KEY,
      guild_id TEXT NOT NULL,
      word TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'delete',
      action_duration INTEGER,
      UNIQUE(guild_id, word)
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

export async function setRelationDirect(
  userId: string,
  username: string,
  fields: { affinity?: number; annoyance?: number }
): Promise<void> {
  await getRelation(userId, username); // ensure row exists
  if (fields.affinity !== undefined && fields.annoyance !== undefined) {
    await pool.query(
      `UPDATE user_relations SET affinity=$1, annoyance=$2, last_annoyance_update=NOW() WHERE user_id=$3`,
      [Math.max(-100, Math.min(100, fields.affinity)), Math.max(0, Math.min(100, fields.annoyance)), userId]
    );
  } else if (fields.affinity !== undefined) {
    await pool.query(
      `UPDATE user_relations SET affinity=$1 WHERE user_id=$2`,
      [Math.max(-100, Math.min(100, fields.affinity)), userId]
    );
  } else if (fields.annoyance !== undefined) {
    await pool.query(
      `UPDATE user_relations SET annoyance=$1, last_annoyance_update=NOW() WHERE user_id=$2`,
      [Math.max(0, Math.min(100, fields.annoyance)), userId]
    );
  }
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

export async function getAllUserRelations(): Promise<{
  user_id: string;
  username: string;
  affinity: number;
  annoyance: number;
  enemy: boolean;
  blacklisted: boolean;
}[]> {
  const res = await pool.query(
    `SELECT user_id, username, affinity, annoyance, enemy, blacklisted
     FROM user_relations
     ORDER BY (annoyance * 0.7 + GREATEST(0, -affinity) * 0.3) DESC`
  );
  return res.rows;
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

export async function getUserAutoreacts(guildId: string, userId: string) {
  const res = await pool.query(
    `SELECT emoji FROM user_autoreacts WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  return res.rows.map((r: { emoji: string }) => r.emoji);
}

export async function getUserAutoreplies(guildId: string, userId: string) {
  const res = await pool.query(
    `SELECT reply FROM user_autoreplies WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  return res.rows.map((r: { reply: string }) => r.reply);
}

// Number of most-recent messages kept verbatim in context
export const VERBATIM_LIMIT = 20;
// When total messages exceed this, older ones get summarized and pruned
const SUMMARIZE_THRESHOLD = 30;

export async function getConversationHistory(
  guildId: string,
  userId: string
): Promise<{ role: "user" | "assistant"; content: string }[]> {
  const res = await pool.query(
    `SELECT role, content FROM (
       SELECT role, content, created_at
       FROM conversation_history
       WHERE guild_id=$1 AND user_id=$2
       ORDER BY created_at DESC
       LIMIT $3
     ) sub ORDER BY created_at ASC`,
    [guildId, userId, VERBATIM_LIMIT]
  );
  return res.rows as { role: "user" | "assistant"; content: string }[];
}

export async function getConversationSummaryRecord(
  guildId: string,
  userId: string
): Promise<{ summary: string; messages_covered: number } | null> {
  const res = await pool.query(
    `SELECT summary, messages_covered FROM conversation_summaries WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  return res.rows[0] ?? null;
}

export async function saveConversationSummary(
  guildId: string,
  userId: string,
  summary: string,
  messagesCovered: number
): Promise<void> {
  await pool.query(
    `INSERT INTO conversation_summaries (guild_id, user_id, summary, messages_covered, updated_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (guild_id, user_id) DO UPDATE
       SET summary=$3, messages_covered=$4, updated_at=NOW()`,
    [guildId, userId, summary, messagesCovered]
  );
}

export async function saveConversationTurn(
  guildId: string,
  userId: string,
  userMessage: string,
  assistantReply: string
): Promise<void> {
  await pool.query(
    `INSERT INTO conversation_history (guild_id, user_id, role, content)
     VALUES ($1, $2, 'user', $3), ($1, $2, 'assistant', $4)`,
    [guildId, userId, userMessage, assistantReply]
  );
}

export async function getMessagesToSummarize(
  guildId: string,
  userId: string
): Promise<{ id: number; role: string; content: string }[] | null> {
  const countRes = await pool.query(
    `SELECT COUNT(*) as total FROM conversation_history WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  const total = parseInt(countRes.rows[0].total, 10);
  if (total <= SUMMARIZE_THRESHOLD) return null;

  const toSummarize = total - VERBATIM_LIMIT;
  const res = await pool.query(
    `SELECT id, role, content FROM conversation_history
     WHERE guild_id=$1 AND user_id=$2
     ORDER BY created_at ASC
     LIMIT $3`,
    [guildId, userId, toSummarize]
  );
  return res.rows;
}

export async function deleteMessagesByIds(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await pool.query(
    `DELETE FROM conversation_history WHERE id = ANY($1)`,
    [ids]
  );
}

export async function clearConversationHistory(
  guildId: string,
  userId: string
): Promise<number> {
  await pool.query(
    `DELETE FROM conversation_summaries WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  const res = await pool.query(
    `DELETE FROM conversation_history WHERE guild_id=$1 AND user_id=$2`,
    [guildId, userId]
  );
  return res.rowCount ?? 0;
}

export async function getFullConversationLog(
  guildId: string,
  userId: string
): Promise<{ role: string; content: string; created_at: Date }[]> {
  const res = await pool.query(
    `SELECT role, content, created_at FROM conversation_history
     WHERE guild_id=$1 AND user_id=$2
     ORDER BY created_at ASC`,
    [guildId, userId]
  );
  return res.rows;
}

// ─── Automod ─────────────────────────────────────────────────────────────────

export interface AutomodRule {
  id: number;
  guild_id: string;
  type: string;
  config: Record<string, any>;
  action: string;
  action_duration: number | null;
  enabled: boolean;
}

export async function getAutomodRules(guildId: string): Promise<AutomodRule[]> {
  const res = await pool.query(
    `SELECT * FROM automod_rules WHERE guild_id=$1 ORDER BY id`,
    [guildId]
  );
  return res.rows;
}

export async function upsertAutomodRule(
  guildId: string,
  type: string,
  config: Record<string, any>,
  action: string,
  actionDuration?: number | null
): Promise<AutomodRule> {
  const existing = await pool.query(
    `SELECT id FROM automod_rules WHERE guild_id=$1 AND type=$2`,
    [guildId, type]
  );
  if (existing.rows[0]) {
    const res = await pool.query(
      `UPDATE automod_rules SET config=$3, action=$4, action_duration=$5, enabled=TRUE WHERE guild_id=$1 AND type=$2 RETURNING *`,
      [guildId, type, config, action, actionDuration ?? null]
    );
    return res.rows[0];
  }
  const res = await pool.query(
    `INSERT INTO automod_rules (guild_id, type, config, action, action_duration) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [guildId, type, config, action, actionDuration ?? null]
  );
  return res.rows[0];
}

export async function toggleAutomodRule(guildId: string, id: number, enabled: boolean): Promise<boolean> {
  const res = await pool.query(
    `UPDATE automod_rules SET enabled=$3 WHERE guild_id=$1 AND id=$2`,
    [guildId, id, enabled]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function deleteAutomodRule(guildId: string, id: number): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM automod_rules WHERE guild_id=$1 AND id=$2`,
    [guildId, id]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function getAutomodWords(guildId: string): Promise<{ id: number; word: string; action: string; action_duration: number | null }[]> {
  const res = await pool.query(
    `SELECT * FROM automod_words WHERE guild_id=$1 ORDER BY word`,
    [guildId]
  );
  return res.rows;
}

export async function addAutomodWord(guildId: string, word: string, action: string, actionDuration?: number | null): Promise<void> {
  await pool.query(
    `INSERT INTO automod_words (guild_id, word, action, action_duration) VALUES ($1,$2,$3,$4) ON CONFLICT (guild_id, word) DO UPDATE SET action=$3, action_duration=$4`,
    [guildId, word.toLowerCase(), action, actionDuration ?? null]
  );
}

export async function removeAutomodWord(guildId: string, word: string): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM automod_words WHERE guild_id=$1 AND word=$2`,
    [guildId, word.toLowerCase()]
  );
  return (res.rowCount ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────

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

// ─── Leveling ────────────────────────────────────────────────────────────────

export async function getUserLevel(guildId: string, userId: string) {
  const res = await pool.query(
    `SELECT * FROM user_levels WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
  return res.rows[0] ?? null;
}

export async function addXp(
  guildId: string,
  userId: string,
  amount: number
): Promise<{ newXp: number; newLevel: number; oldLevel: number }> {
  const res = await pool.query(
    `INSERT INTO user_levels (guild_id, user_id, xp, level, total_messages)
     VALUES ($1, $2, $3, 0, 1)
     ON CONFLICT (guild_id, user_id) DO UPDATE
       SET xp = user_levels.xp + $3,
           total_messages = user_levels.total_messages + 1
     RETURNING xp, level`,
    [guildId, userId, amount]
  );
  const { xp: newXp, level: oldLevel } = res.rows[0];
  return { newXp, newLevel: oldLevel, oldLevel };
}

export async function setLevelInDb(guildId: string, userId: string, level: number) {
  await pool.query(
    `UPDATE user_levels SET level = $3 WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId, level]
  );
}

export async function getLeaderboard(guildId: string, limit: number) {
  const res = await pool.query(
    `SELECT user_id, xp, level, total_messages FROM user_levels
     WHERE guild_id = $1 ORDER BY xp DESC LIMIT $2`,
    [guildId, limit]
  );
  return res.rows;
}

export async function setLevelChannel(guildId: string, channelId: string) {
  await pool.query(
    `INSERT INTO level_channels (guild_id, channel_id) VALUES ($1, $2)
     ON CONFLICT (guild_id) DO UPDATE SET channel_id = $2`,
    [guildId, channelId]
  );
}

export async function disableLevelChannel(guildId: string) {
  await pool.query(`DELETE FROM level_channels WHERE guild_id = $1`, [guildId]);
}

export async function getLevelChannel(guildId: string): Promise<string | null> {
  const res = await pool.query(
    `SELECT channel_id FROM level_channels WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0]?.channel_id ?? null;
}

export async function addLevelRole(guildId: string, level: number, roleId: string) {
  await pool.query(
    `INSERT INTO level_roles (guild_id, level, role_id) VALUES ($1, $2, $3)
     ON CONFLICT (guild_id, level) DO UPDATE SET role_id = $3`,
    [guildId, level, roleId]
  );
}

export async function removeLevelRole(guildId: string, level: number) {
  await pool.query(
    `DELETE FROM level_roles WHERE guild_id = $1 AND level = $2`,
    [guildId, level]
  );
}

export async function getLevelRoles(guildId: string) {
  const res = await pool.query(
    `SELECT level, role_id FROM level_roles WHERE guild_id = $1 ORDER BY level ASC`,
    [guildId]
  );
  return res.rows;
}

export async function getLevelRoleForLevel(guildId: string, level: number) {
  const res = await pool.query(
    `SELECT role_id FROM level_roles WHERE guild_id = $1 AND level = $2`,
    [guildId, level]
  );
  return res.rows[0]?.role_id ?? null;
}

export async function setUserXp(guildId: string, userId: string, xp: number) {
  await pool.query(
    `INSERT INTO user_levels (guild_id, user_id, xp, level, total_messages)
     VALUES ($1, $2, $3, 0, 0)
     ON CONFLICT (guild_id, user_id) DO UPDATE SET xp = $3`,
    [guildId, userId, xp]
  );
}

export async function resetUserXp(guildId: string, userId: string) {
  await pool.query(
    `DELETE FROM user_levels WHERE guild_id = $1 AND user_id = $2`,
    [guildId, userId]
  );
}

export async function resetAllXp(guildId: string) {
  await pool.query(`DELETE FROM user_levels WHERE guild_id = $1`, [guildId]);
}

// ─── Lockdown ────────────────────────────────────────────────────────────────

export async function saveLockdownOverwrites(
  guildId: string,
  overwrites: { channelId: string; allow: string; deny: string }[]
) {
  for (const o of overwrites) {
    await pool.query(
      `INSERT INTO lockdown_overwrites (guild_id, channel_id, allow, deny)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (guild_id, channel_id) DO UPDATE SET allow = $3, deny = $4`,
      [guildId, o.channelId, o.allow, o.deny]
    );
  }
}

export async function getLockdownOverwrites(guildId: string) {
  const res = await pool.query(
    `SELECT channel_id, allow, deny FROM lockdown_overwrites WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows;
}

export async function clearLockdownOverwrites(guildId: string) {
  await pool.query(`DELETE FROM lockdown_overwrites WHERE guild_id = $1`, [guildId]);
}

export async function setLockdownState(guildId: string, active: boolean, reason: string | null) {
  await pool.query(
    `INSERT INTO lockdown_state (guild_id, active, reason, started_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (guild_id) DO UPDATE SET active = $2, reason = $3, started_at = NOW()`,
    [guildId, active, reason]
  );
}

export async function getLockdownState(guildId: string) {
  const res = await pool.query(
    `SELECT active, reason, started_at FROM lockdown_state WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0] ?? null;
}

// ─── Anti-Nuke / Anti-Raid Settings ─────────────────────────────────────────

export async function getAntiNukeSettings(guildId: string) {
  const res = await pool.query(
    `SELECT * FROM anti_nuke_settings WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0] ?? null;
}

export async function setAntiNukeSettings(
  guildId: string,
  settings: {
    enabled: boolean;
    channel_threshold: number;
    ban_threshold: number;
    role_threshold: number;
    window_seconds: number;
  }
) {
  await pool.query(
    `INSERT INTO anti_nuke_settings (guild_id, enabled, channel_threshold, ban_threshold, role_threshold, window_seconds)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (guild_id) DO UPDATE SET
       enabled = $2, channel_threshold = $3, ban_threshold = $4,
       role_threshold = $5, window_seconds = $6`,
    [guildId, settings.enabled, settings.channel_threshold, settings.ban_threshold, settings.role_threshold, settings.window_seconds]
  );
}

export async function getAntiRaidSettings(guildId: string) {
  const res = await pool.query(
    `SELECT * FROM anti_raid_settings WHERE guild_id = $1`,
    [guildId]
  );
  return res.rows[0] ?? null;
}

export async function setAntiRaidSettings(
  guildId: string,
  settings: { enabled: boolean; join_threshold: number; window_seconds: number }
) {
  await pool.query(
    `INSERT INTO anti_raid_settings (guild_id, enabled, join_threshold, window_seconds)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (guild_id) DO UPDATE SET enabled = $2, join_threshold = $3, window_seconds = $4`,
    [guildId, settings.enabled, settings.join_threshold, settings.window_seconds]
  );
}

// ─── Server Backups ──────────────────────────────────────────────────────────

export async function saveServerBackup(guildId: string, name: string, data: object): Promise<number> {
  const res = await pool.query(
    `INSERT INTO server_backups (guild_id, name, data) VALUES ($1, $2, $3) RETURNING id`,
    [guildId, name, JSON.stringify(data)]
  );
  return res.rows[0].id;
}

export async function listServerBackups(guildId: string) {
  const res = await pool.query(
    `SELECT id, name, created_at FROM server_backups WHERE guild_id = $1 ORDER BY created_at DESC`,
    [guildId]
  );
  return res.rows;
}

export async function getServerBackup(guildId: string, id: number) {
  const res = await pool.query(
    `SELECT id, name, created_at, data FROM server_backups WHERE guild_id = $1 AND id = $2`,
    [guildId, id]
  );
  return res.rows[0] ?? null;
}

export async function deleteServerBackup(guildId: string, id: number): Promise<boolean> {
  const res = await pool.query(
    `DELETE FROM server_backups WHERE guild_id = $1 AND id = $2 RETURNING id`,
    [guildId, id]
  );
  return res.rowCount! > 0;
}

// ─── Invite Tracking ─────────────────────────────────────────────────────────

export async function recordInviteUse(
  guildId: string,
  inviterId: string,
  inviteeId: string,
  code: string
) {
  await pool.query(
    `INSERT INTO invite_uses (guild_id, inviter_id, invitee_id, invite_code)
     VALUES ($1, $2, $3, $4)`,
    [guildId, inviterId, inviteeId, code]
  );
}

export async function markMemberLeft(guildId: string, inviteeId: string) {
  await pool.query(
    `UPDATE invite_uses SET still_in_server = FALSE
     WHERE guild_id = $1 AND invitee_id = $2 AND still_in_server = TRUE`,
    [guildId, inviteeId]
  );
}

export async function getInviteStats(guildId: string, userId: string) {
  const res = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE inviter_id = $2) AS total,
       COUNT(*) FILTER (WHERE inviter_id = $2 AND still_in_server = FALSE) AS left
     FROM invite_uses WHERE guild_id = $1`,
    [guildId, userId]
  );
  return { total: parseInt(res.rows[0].total), left: parseInt(res.rows[0].left) };
}

export async function getInviteLeaderboard(guildId: string, limit: number) {
  const res = await pool.query(
    `SELECT
       inviter_id,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE still_in_server = FALSE) AS left
     FROM invite_uses
     WHERE guild_id = $1
     GROUP BY inviter_id
     ORDER BY total DESC
     LIMIT $2`,
    [guildId, limit]
  );
  return res.rows;
}

// ─── Reaction Roles ──────────────────────────────────────────────────────────

export async function addReactionRole(
  guildId: string,
  channelId: string,
  messageId: string,
  emoji: string,
  roleId: string
) {
  await pool.query(
    `INSERT INTO reaction_roles (guild_id, channel_id, message_id, emoji, role_id)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (guild_id, message_id, emoji) DO UPDATE SET role_id = $5`,
    [guildId, channelId, messageId, emoji, roleId]
  );
}

export async function removeReactionRole(guildId: string, messageId: string, emoji: string) {
  await pool.query(
    `DELETE FROM reaction_roles WHERE guild_id = $1 AND message_id = $2 AND emoji = $3`,
    [guildId, messageId, emoji]
  );
}

export async function getReactionRoles(guildId: string) {
  const res = await pool.query(
    `SELECT * FROM reaction_roles WHERE guild_id = $1 ORDER BY id ASC`,
    [guildId]
  );
  return res.rows;
}

export async function getReactionRoleForEmoji(guildId: string, messageId: string, emoji: string) {
  const res = await pool.query(
    `SELECT * FROM reaction_roles WHERE guild_id = $1 AND message_id = $2 AND emoji = $3 LIMIT 1`,
    [guildId, messageId, emoji]
  );
  return res.rows[0] ?? null;
}

export async function getDmNsfwEnabled(): Promise<boolean> {
  const res = await pool.query(`SELECT value FROM bot_settings WHERE key = 'dm_nsfw_enabled'`);
  return res.rows[0]?.value === "true";
}

export async function setDmNsfwEnabled(enabled: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO bot_settings (key, value) VALUES ('dm_nsfw_enabled', $1)
     ON CONFLICT (key) DO UPDATE SET value = $1`,
    [enabled ? "true" : "false"]
  );
}

