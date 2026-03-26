import { SlashCommandBuilder, EmbedBuilder, CommandInteraction, Client } from "discord.js";
import { pool } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("diagnostics")
  .setDescription("Full system diagnostics (owner only)");

export async function execute(interaction: CommandInteraction, client: Client) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "Not for you.", flags: 64 });
  }

  await interaction.deferReply({ flags: 64 });

  const uptime = process.uptime();
  const uptimeStr = [
    Math.floor(uptime / 86400) > 0 ? `${Math.floor(uptime / 86400)}d` : null,
    `${Math.floor((uptime % 86400) / 3600)}h`,
    `${Math.floor((uptime % 3600) / 60)}m`,
    `${Math.floor(uptime % 60)}s`,
  ].filter(Boolean).join(" ");

  const mem = process.memoryUsage();
  const toMB = (b: number) => `${(b / 1024 / 1024).toFixed(1)} MB`;

  let dbPing = "—";
  let dbStatus = "✅ Connected";
  try {
    const start = Date.now();
    await pool.query("SELECT 1");
    dbPing = `${Date.now() - start}ms`;
  } catch {
    dbStatus = "❌ Failed";
  }

  let totalUsers = 0;
  let totalChannels = 0;
  try {
    totalUsers = client.guilds.cache.reduce((a, g) => a + g.memberCount, 0);
    totalChannels = client.channels.cache.size;
  } catch {}

  const embed = new EmbedBuilder()
    .setTitle("🔬 Lilith — Diagnostics")
    .setColor(0x1a0010)
    .addFields(
      { name: "⏱️ Uptime",         value: uptimeStr,                              inline: true },
      { name: "📡 WS Ping",        value: `${client.ws.ping}ms`,                  inline: true },
      { name: "🗄️ DB Ping",        value: dbPing,                                 inline: true },
      { name: "🗄️ DB Status",      value: dbStatus,                               inline: true },
      { name: "🌐 Guilds",         value: `${client.guilds.cache.size}`,           inline: true },
      { name: "👥 Total Members",  value: `${totalUsers.toLocaleString()}`,        inline: true },
      { name: "💬 Channels",       value: `${totalChannels}`,                      inline: true },
      { name: "🧠 Heap Used",      value: toMB(mem.heapUsed),                     inline: true },
      { name: "🧠 Heap Total",     value: toMB(mem.heapTotal),                    inline: true },
      { name: "📦 RSS",            value: toMB(mem.rss),                          inline: true },
      { name: "🟢 Node.js",        value: process.version,                        inline: true },
      { name: "📋 Platform",       value: process.platform,                       inline: true },
    )
    .setFooter({ text: `PID ${process.pid} · Lilith#6931` })
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}
