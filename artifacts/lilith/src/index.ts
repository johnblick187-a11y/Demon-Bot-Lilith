import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  Collection,
} from "discord.js";
import { initDb } from "./lib/db.js";
import { handleReady } from "./events/ready.js";
import { handleMessageCreate } from "./events/messageCreate.js";
import { handleInteractionCreate } from "./events/interactionCreate.js";

import * as status from "./commands/core/status.js";
import * as help from "./commands/core/help.js";
import * as mood from "./commands/core/mood.js";
import * as annoyance from "./commands/core/annoyance.js";
import * as affinity from "./commands/core/affinity.js";
import * as prefix from "./commands/core/prefix.js";
import * as createCommand from "./commands/core/createcommand.js";
import * as enemy from "./commands/core/enemy.js";

import * as ask from "./commands/ai/ask.js";
import * as task from "./commands/ai/task.js";
import * as nsfwtoggle from "./commands/ai/nsfwtoggle.js";
import * as google from "./commands/ai/google.js";

import { commands as actionCommands, execute as executeAction } from "./commands/interaction/actions.js";
import * as ship from "./commands/interaction/ship.js";
import {
  smashData,
  executeSmash,
  blowData,
  executeBlow,
  eatData,
  executeEat,
} from "./commands/interaction/nsfw_actions.js";

import * as ban from "./commands/moderation/ban.js";
import * as kick from "./commands/moderation/kick.js";
import * as warn from "./commands/moderation/warn.js";
import * as timeout from "./commands/moderation/timeout.js";
import * as purge from "./commands/moderation/purge.js";
import * as rename from "./commands/moderation/rename.js";
import {
  makeroleData,
  executeMakerole,
  editroleData,
  executeEditrole,
  deleteroleData,
  executeDeleterole,
} from "./commands/moderation/roles.js";
import * as channel from "./commands/moderation/channel.js";
import * as info from "./commands/moderation/info.js";
import { avatarData, executeAvatar, bannerData, executeBanner } from "./commands/moderation/avatar.js";
import * as autoreact from "./commands/moderation/autoreact.js";
import * as autoreply from "./commands/moderation/autoreply.js";
import * as stealemoji from "./commands/moderation/stealemoji.js";
import * as stealsticker from "./commands/moderation/stealsticker.js";

import {
  hitsmethData, executeHitsmeth,
  hitsweedData, executeHitsweed,
  chugsdrinkData, executeChugsdrink,
  popspillData, executePopspill,
} from "./commands/fun/drugs.js";

import * as tts from "./commands/generation/tts.js";
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
  ],
});

const commandMap = new Map<string, (interaction: any, client: Client) => Promise<void>>();

const allCommandDefs: any[] = [
  status.data,
  help.data,
  mood.data,
  annoyance.data,
  affinity.data,
  prefix.data,
  createCommand.data,
  enemy.data,
  ask.data,
  task.data,
  nsfwtoggle.data,
  google.data,
  ship.data,
  smashData,
  blowData,
  eatData,
  ban.data,
  kick.data,
  warn.data,
  timeout.data,
  purge.data,
  rename.data,
  makeroleData,
  editroleData,
  deleteroleData,
  channel.data,
  info.data,
  avatarData,
  bannerData,
  autoreact.data,
  autoreply.data,
  stealemoji.data,
  stealsticker.data,
  hitsmethData,
  hitsweedData,
  chugsdrinkData,
  popspillData,
  tts.data,
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
commandMap.set("help", (i) => help.execute(i));
commandMap.set("mood", (i) => mood.execute(i));
commandMap.set("annoyance", (i) => annoyance.execute(i));
commandMap.set("affinity", (i) => affinity.execute(i));
commandMap.set("changeprefix", (i) => prefix.execute(i));
commandMap.set("create", (i) => createCommand.execute(i));
commandMap.set("enemy", (i) => enemy.execute(i));
commandMap.set("ask", (i) => ask.execute(i));
commandMap.set("task", (i) => task.execute(i));
commandMap.set("nsfwtoggle", (i) => nsfwtoggle.execute(i));
commandMap.set("google", (i) => google.execute(i));
commandMap.set("ship", (i) => ship.execute(i));
commandMap.set("smash", (i, c) => executeSmash(i, c));
commandMap.set("blow", (i, c) => executeBlow(i, c));
commandMap.set("eat", (i, c) => executeEat(i, c));
commandMap.set("ban", (i) => ban.execute(i));
commandMap.set("kick", (i) => kick.execute(i));
commandMap.set("warn", (i) => warn.execute(i));
commandMap.set("timeout", (i) => timeout.execute(i));
commandMap.set("purge", (i) => purge.execute(i));
commandMap.set("rename", (i) => rename.execute(i));
commandMap.set("makerole", (i) => executeMakerole(i));
commandMap.set("editrole", (i) => executeEditrole(i));
commandMap.set("deleterole", (i) => executeDeleterole(i));
commandMap.set("channel", (i) => channel.execute(i));
commandMap.set("info", (i) => info.execute(i));
commandMap.set("avatar", (i) => executeAvatar(i));
commandMap.set("banner", (i) => executeBanner(i));
commandMap.set("autoreact", (i) => autoreact.execute(i));
commandMap.set("autoreply", (i) => autoreply.execute(i));
commandMap.set("stealemoji", (i) => stealemoji.execute(i));
commandMap.set("stealsticker", (i) => stealsticker.execute(i));
commandMap.set("hitsmeth", (i) => executeHitsmeth(i));
commandMap.set("hitsweed", (i) => executeHitsweed(i));
commandMap.set("chugsdrink", (i) => executeChugsdrink(i));
commandMap.set("popspill", (i) => executePopspill(i));
commandMap.set("tts", (i) => tts.execute(i));
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

process.on("uncaughtException", (err: any) => {
  if (err?.code === 10062) return;
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (reason: any) => {
  if (reason?.code === 10062) return;
  console.error("Unhandled rejection:", reason);
});

client.once("ready", () => handleReady(client));

client.on("messageCreate", (message) => handleMessageCreate(message, client));

client.on("interactionCreate", (interaction) =>
  handleInteractionCreate(interaction, client, commandMap)
);

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN!);
  const appId = (await client.application?.fetch())?.id;
  if (!appId) {
    console.log("Could not fetch app ID for command registration. Skipping global registration.");
    return;
  }
  try {
    console.log("Registering slash commands globally...");
    await rest.put(Routes.applicationCommands(appId), {
      body: allCommandDefs.map((c) => c.toJSON()),
    });
    console.log(`Registered ${allCommandDefs.length} slash commands.`);
  } catch (err) {
    console.error("Failed to register commands:", err);
  }
}

async function main() {
  console.log("Initializing database...");
  await initDb();
  console.log("Database ready.");

  await client.login(TOKEN);

  client.once("ready", async () => {
    await registerCommands();
  });
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
