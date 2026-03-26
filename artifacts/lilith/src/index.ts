import {
  Client,
  GatewayIntentBits,
  Partials,
  REST,
  Routes,
  Collection,
} from "discord.js";
import { initDb } from "./lib/db.js";
import { handleReady } from "./events/ready.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleInteractionCreate } from "./events/interactionCreate.js";
import { registerLoggingEvents } from "./events/logging.js";
import { handleReactionAdd, handleReactionRemove } from "./events/reactionRoles.js";
import { handleGuildMemberAdd, handleGuildMemberRemove } from "./events/memberEvents.js";
import { cacheAllGuilds, updateCacheOnInviteCreate, updateCacheOnInviteDelete } from "./lib/inviteCache.js";
import { handleChannelDelete, handleGuildBanAdd, handleRoleDelete } from "./events/nukeEvents.js";

import * as status from "./commands/core/status.js";
import * as diagnostics from "./commands/core/diagnostics.js";
import * as unblacklist from "./commands/core/unblacklist.js";
import * as override from "./commands/core/override.js";
import * as help from "./commands/core/help.js";
import * as prefix from "./commands/core/prefix.js";
import * as createCommand from "./commands/core/createcommand.js";
import * as enemy from "./commands/core/enemy.js";
import * as memory from "./commands/core/memory.js";
import * as dmmode from "./commands/core/dmmode.js";
import * as temperament from "./commands/core/temperament.js";
import { loadForcedPersonalityFromDb } from "./lib/ai.js";
import * as setannoyance from "./commands/core/setannoyance.js";
import * as setaffinity from "./commands/core/setaffinity.js";

import * as ask from "./commands/ai/ask.js";
import * as task from "./commands/ai/task.js";
import * as nsfwtoggle from "./commands/ai/nsfwtoggle.js";
import * as chattoggle from "./commands/ai/chattoggle.js";
import * as tldr from "./commands/ai/tldr.js";
import * as google from "./commands/ai/google.js";

import { commands as actionCommands, execute as executeAction } from "./commands/interaction/actions.js";
import * as ship from "./commands/interaction/ship.js";
import {
  smashData,
  executeSmash,
  blowData,
  executeBlow,
} from "./commands/interaction/nsfw_actions.js";

import * as ban from "./commands/moderation/ban.js";
import * as unban from "./commands/moderation/unban.js";
import * as kick from "./commands/moderation/kick.js";
import * as warn from "./commands/moderation/warn.js";
import * as timeout from "./commands/moderation/timeout.js";
import * as purge from "./commands/moderation/purge.js";
import * as setlogchannel from "./commands/moderation/setlogchannel.js";
import * as dm from "./commands/moderation/dm.js";
import * as rename from "./commands/moderation/rename.js";
import {
  makeroleData,
  executeMakerole,
  editroleData,
  executeEditrole,
  deleteroleData,
  executeDeleterole,
  giveroleData,
  executeGiverole,
  removeroleData,
  executeRemoverole,
} from "./commands/moderation/roles.js";
import * as channel from "./commands/moderation/channel.js";
import * as info from "./commands/moderation/info.js";
import { avatarData, executeAvatar, bannerData, executeBanner } from "./commands/moderation/avatar.js";
import * as automod from "./commands/moderation/automod.js";
import * as webhook from "./commands/moderation/webhook.js";
import * as reactionrole from "./commands/moderation/reactionrole.js";
import * as levelconfig from "./commands/moderation/levelconfig.js";
import * as invites from "./commands/moderation/invites.js";
import * as massnick from "./commands/moderation/massnick.js";
import * as lockdown from "./commands/moderation/lockdown.js";
import * as antinuke from "./commands/moderation/antinuke.js";
import * as serverbackup from "./commands/moderation/serverbackup.js";
import * as rank from "./commands/fun/rank.js";
import * as leaderboard from "./commands/fun/leaderboard.js";
import * as autoreact from "./commands/moderation/autoreact.js";
import * as autoreply from "./commands/moderation/autoreply.js";
import * as userreact from "./commands/moderation/userreact.js";
import * as userreply from "./commands/moderation/userreply.js";
import * as stealemoji from "./commands/moderation/stealemoji.js";
import * as stealsticker from "./commands/moderation/stealsticker.js";
import * as stealsound from "./commands/moderation/stealsound.js";

import * as generate from "./commands/generation/generate.js";

import * as join from "./commands/vc/join.js";
import * as leave from "./commands/vc/leave.js";
import {
  playData, executePlay,
  pauseData, executePause,
  resumeData, executeResume,
  skipData, executeSkip,
  stopData, executeStop,
  queueData, executeQueue,
} from "./commands/vc/music.js";
import {
  vcmoveData, executeVcmove,
  vcmuteData, executeVcmute,
  vcunmuteData, executeVcunmute,
  vcdeafenData, executeVcdeafen,
  vcundeafenData, executeVcundeafen,
} from "./commands/vc/vcmod.js";

const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) throw new Error("DISCORD_TOKEN is required");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildEmojisAndStickers,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.DirectMessageTyping,
  ],
  partials: [Partials.Channel, Partials.Message],
});

const commandMap = new Map<string, (interaction: any, client: Client) => Promise<void>>();

const allCommandDefs: any[] = [
  status.data,
  diagnostics.data,
  unblacklist.data,
  override.data,
  help.data,
  prefix.data,
  createCommand.data,
  enemy.data,
  memory.data,
  dmmode.data,
  temperament.data,
  setannoyance.data,
  setaffinity.data,
  ask.data,
  task.data,
  nsfwtoggle.data,
  chattoggle.data,
  tldr.data,
  google.data,
  ship.data,
  smashData,
  blowData,
  ban.data,
  unban.data,
  kick.data,
  warn.data,
  timeout.data,
  purge.data,
  setlogchannel.data,
  dm.data,
  rename.data,
  makeroleData,
  editroleData,
  deleteroleData,
  giveroleData,
  removeroleData,
  channel.data,
  info.data,
  avatarData,
  bannerData,
  automod.data,
  webhook.data,
  reactionrole.data,
  levelconfig.data,
  invites.data,
  massnick.data,
  lockdown.data,
  antinuke.data,
  serverbackup.data,
  rank.data,
  leaderboard.data,
  autoreact.data,
  autoreply.data,
  userreact.data,
  userreply.data,
  stealemoji.data,
  stealsticker.data,
  stealsound.data,
  generate.data,
  join.data,
  leave.data,
  playData,
  pauseData,
  resumeData,
  skipData,
  stopData,
  queueData,
  vcmoveData,
  vcmuteData,
  vcunmuteData,
  vcdeafenData,
  vcundeafenData,
  ...actionCommands.map((c) => c.data),
];

commandMap.set("status", (i, c) => status.execute(i, c));
commandMap.set("diagnostics", (i, c) => diagnostics.execute(i, c));
commandMap.set("unblacklist", (i) => unblacklist.execute(i));
commandMap.set("override", (i) => override.execute(i));
commandMap.set("help", (i) => help.execute(i));
commandMap.set("changeprefix", (i) => prefix.execute(i));
commandMap.set("create", (i) => createCommand.execute(i));
commandMap.set("enemy", (i) => enemy.execute(i));
commandMap.set("memory", (i) => memory.execute(i));
commandMap.set("dmmode", (i) => dmmode.execute(i));
commandMap.set("temperament", (i) => temperament.execute(i));
commandMap.set("setannoyance", (i) => setannoyance.execute(i));
commandMap.set("setaffinity", (i) => setaffinity.execute(i));
commandMap.set("ask", (i) => ask.execute(i));
commandMap.set("task", (i) => task.execute(i));
commandMap.set("nsfwtoggle", (i) => nsfwtoggle.execute(i));
commandMap.set("chattoggle", (i) => chattoggle.execute(i));
commandMap.set("tldr", (i) => tldr.execute(i));
commandMap.set("google", (i) => google.execute(i));
commandMap.set("ship", (i) => ship.execute(i));
commandMap.set("smash", (i, c) => executeSmash(i, c));
commandMap.set("blow", (i, c) => executeBlow(i, c));
commandMap.set("ban", (i) => ban.execute(i));
commandMap.set("unban", (i) => unban.execute(i));
commandMap.set("kick", (i) => kick.execute(i));
commandMap.set("warn", (i) => warn.execute(i));
commandMap.set("timeout", (i) => timeout.execute(i));
commandMap.set("purge", (i) => purge.execute(i));
commandMap.set("setlogchannel", (i) => setlogchannel.execute(i));
commandMap.set("dm", (i) => dm.execute(i));
commandMap.set("rename", (i) => rename.execute(i));
commandMap.set("makerole", (i) => executeMakerole(i));
commandMap.set("editrole", (i) => executeEditrole(i));
commandMap.set("deleterole", (i) => executeDeleterole(i));
commandMap.set("giverole", (i) => executeGiverole(i));
commandMap.set("removerole", (i) => executeRemoverole(i));
commandMap.set("channel", (i) => channel.execute(i));
commandMap.set("info", (i) => info.execute(i));
commandMap.set("avatar", (i) => executeAvatar(i));
commandMap.set("banner", (i) => executeBanner(i));
commandMap.set("automod", (i) => automod.execute(i));
commandMap.set("webhook", (i) => webhook.execute(i));
commandMap.set("reactionrole", (i) => reactionrole.execute(i));
commandMap.set("levelconfig", (i) => levelconfig.execute(i));
commandMap.set("invites", (i) => invites.execute(i));
commandMap.set("massnick", (i) => massnick.execute(i));
commandMap.set("lockdown", (i) => lockdown.execute(i));
commandMap.set("antinuke", (i) => antinuke.execute(i));
commandMap.set("serverbackup", (i) => serverbackup.execute(i));
commandMap.set("rank", (i) => rank.execute(i));
commandMap.set("leaderboard", (i) => leaderboard.execute(i));
commandMap.set("autoreact", (i) => autoreact.execute(i));
commandMap.set("autoreply", (i) => autoreply.execute(i));
commandMap.set("userreact", (i) => userreact.execute(i));
commandMap.set("userreply", (i) => userreply.execute(i));
commandMap.set("stealemoji", (i) => stealemoji.execute(i));
commandMap.set("stealsticker", (i) => stealsticker.execute(i));
commandMap.set("stealsound", (i) => stealsound.execute(i));
commandMap.set("generate", (i) => generate.execute(i));
commandMap.set("join", (i) => join.execute(i));
commandMap.set("leave", (i) => leave.execute(i));
commandMap.set("play", (i) => executePlay(i));
commandMap.set("pause", (i) => executePause(i));
commandMap.set("resume", (i) => executeResume(i));
commandMap.set("skip", (i) => executeSkip(i));
commandMap.set("stop", (i) => executeStop(i));
commandMap.set("queue", (i) => executeQueue(i));
commandMap.set("vcmove", (i) => executeVcmove(i));
commandMap.set("vcmute", (i) => executeVcmute(i));
commandMap.set("vcunmute", (i) => executeVcunmute(i));
commandMap.set("vcdeafen", (i) => executeVcdeafen(i));
commandMap.set("vcundeafen", (i) => executeVcundeafen(i));

for (const { data: actionData, action } of actionCommands) {
  commandMap.set(actionData.name, (i, c) => executeAction(i, action, c));
}

client.on("error", (err) => console.error("Discord client error:", err));

// Cleanly disconnect from Discord on shutdown so no zombie instances linger
process.on("SIGTERM", () => {
  console.log("[Lilith] SIGTERM received — destroying client.");
  client.destroy();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("[Lilith] SIGINT received — destroying client.");
  client.destroy();
  process.exit(0);
});

process.on("uncaughtException", (err: any) => {
  if (err?.code === 10062) return;
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason: any) => {
  if (reason?.code === 10062) return;
  console.error("Unhandled rejection:", reason);
});

registerLoggingEvents(client);

client.once("ready", () => handleReady(client));

client.on("messageCreate", (message) => handleMessageCreate(message, client));

client.on("interactionCreate", (interaction) =>
  handleInteractionCreate(interaction, client, commandMap)
);

client.on("messageReactionAdd", (reaction, user) => handleReactionAdd(reaction, user));
client.on("messageReactionRemove", (reaction, user) => handleReactionRemove(reaction, user));

client.on("guildMemberAdd", (member) => handleGuildMemberAdd(member));
client.on("guildMemberRemove", (member) => handleGuildMemberRemove(member as any));

client.on("inviteCreate", (invite) => updateCacheOnInviteCreate(invite));
client.on("inviteDelete", (invite) => updateCacheOnInviteDelete(invite));

client.on("channelDelete", (channel) => handleChannelDelete(channel as any));
client.on("guildBanAdd", (ban) => handleGuildBanAdd(ban));
client.on("roleDelete", (role) => handleRoleDelete(role));


async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN!);
  const appId = (await client.application?.fetch())?.id;
  if (!appId) {
    console.log("Could not fetch app ID for command registration. Skipping.");
    return;
  }

  // Clear all guild-specific commands so slash commands don't appear in servers
  const guildIds = [...client.guilds.cache.keys()];
  for (const guildId of guildIds) {
    try {
      await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: [] });
      console.log(`Cleared guild commands in guild ${guildId}`);
    } catch (err) {
      console.error(`Failed to clear commands in guild ${guildId}:`, err);
    }
  }

  // Register all commands globally — they appear in DMs and are still callable in servers
  // but won't clutter server slash menus since guild commands are cleared
  try {
    const body = allCommandDefs.map((c) => c.toJSON());
    await rest.put(Routes.applicationCommands(appId), { body });
    console.log(`Registered ${allCommandDefs.length} commands globally.`);
  } catch (err) {
    console.error("Failed to register global commands:", err);
  }
}

async function main() {
  console.log("Initializing database...");
  await initDb();
  console.log("Database ready.");

  await client.login(TOKEN);

  client.once("ready", async () => {
    await loadForcedPersonalityFromDb();
    await registerCommands();
    await cacheAllGuilds(client.guilds.cache);
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
