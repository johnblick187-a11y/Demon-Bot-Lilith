import {
  Client,
  EmbedBuilder,
  TextChannel,
  GuildMember,
  PartialGuildMember,
  Message,
  PartialMessage,
  GuildBan,
  AuditLogEvent,
} from "discord.js";
import { pool } from "../lib/db.js";

async function getLogChannel(guildId: string): Promise<string | null> {
  const res = await pool.query(`SELECT channel_id FROM log_channels WHERE guild_id=$1`, [guildId]);
  return res.rows[0]?.channel_id ?? null;
}

async function sendLog(client: Client, guildId: string, embed: EmbedBuilder) {
  const channelId = await getLogChannel(guildId);
  if (!channelId) return;
  const channel = client.channels.cache.get(channelId) as TextChannel | undefined;
  if (!channel?.isTextBased()) return;
  try {
    await channel.send({ embeds: [embed] });
  } catch {}
}

function ts() {
  return `<t:${Math.floor(Date.now() / 1000)}:F>`;
}

export function registerLoggingEvents(client: Client) {

  // Message deleted
  client.on("messageDelete", async (message: Message | PartialMessage) => {
    if (!message.guildId || message.author?.bot) return;
    const embed = new EmbedBuilder()
      .setTitle("🗑️ Message Deleted")
      .setColor(0xff4444)
      .addFields(
        { name: "Author",   value: message.author ? `<@${message.author.id}> (${message.author.tag})` : "Unknown", inline: true },
        { name: "Channel",  value: `<#${message.channelId}>`, inline: true },
        { name: "Content",  value: message.content?.slice(0, 1000) || "*[empty or uncached]*" },
      )
      .setFooter({ text: `Message ID: ${message.id}` })
      .setTimestamp();
    await sendLog(client, message.guildId, embed);
  });

  // Message edited
  client.on("messageUpdate", async (oldMsg: Message | PartialMessage, newMsg: Message | PartialMessage) => {
    if (!newMsg.guildId || newMsg.author?.bot) return;
    if (oldMsg.content === newMsg.content) return;
    const embed = new EmbedBuilder()
      .setTitle("✏️ Message Edited")
      .setColor(0xf5a623)
      .setURL(newMsg.url)
      .addFields(
        { name: "Author",   value: newMsg.author ? `<@${newMsg.author.id}> (${newMsg.author.tag})` : "Unknown", inline: true },
        { name: "Channel",  value: `<#${newMsg.channelId}>`, inline: true },
        { name: "Before",   value: oldMsg.content?.slice(0, 500) || "*[uncached]*" },
        { name: "After",    value: newMsg.content?.slice(0, 500) || "*[empty]*" },
      )
      .setFooter({ text: `Message ID: ${newMsg.id}` })
      .setTimestamp();
    await sendLog(client, newMsg.guildId, embed);
  });

  // Member joined
  client.on("guildMemberAdd", async (member: GuildMember) => {
    const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);
    const embed = new EmbedBuilder()
      .setTitle("📥 Member Joined")
      .setColor(0x44ff88)
      .setThumbnail(member.user.displayAvatarURL())
      .addFields(
        { name: "User",         value: `<@${member.id}> (${member.user.tag})`, inline: true },
        { name: "Account Age",  value: `${accountAge} days`, inline: true },
        { name: "Created",      value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
      )
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();
    await sendLog(client, member.guild.id, embed);
  });

  // Member left
  client.on("guildMemberRemove", async (member: GuildMember | PartialGuildMember) => {
    const embed = new EmbedBuilder()
      .setTitle("📤 Member Left")
      .setColor(0xaaaaaa)
      .setThumbnail(member.user?.displayAvatarURL() ?? null)
      .addFields(
        { name: "User",  value: `<@${member.id}> (${member.user?.tag ?? "Unknown"})`, inline: true },
        { name: "Roles", value: member.roles?.cache?.filter(r => r.id !== member.guild.id).map(r => `<@&${r.id}>`).join(" ") || "None", inline: false },
      )
      .setFooter({ text: `ID: ${member.id}` })
      .setTimestamp();
    await sendLog(client, member.guild.id, embed);
  });

  // Member banned
  client.on("guildBanAdd", async (ban: GuildBan) => {
    let reason = ban.reason ?? "No reason provided";
    try {
      const logs = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBan, limit: 1 });
      const entry = logs.entries.first();
      if (entry?.target?.id === ban.user.id) {
        reason = entry.reason ?? reason;
      }
    } catch {}

    const embed = new EmbedBuilder()
      .setTitle("🔨 Member Banned")
      .setColor(0xcc0000)
      .setThumbnail(ban.user.displayAvatarURL())
      .addFields(
        { name: "User",    value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
        { name: "Reason",  value: reason },
      )
      .setFooter({ text: `ID: ${ban.user.id}` })
      .setTimestamp();
    await sendLog(client, ban.guild.id, embed);
  });

  // Member unbanned
  client.on("guildBanRemove", async (ban: GuildBan) => {
    const embed = new EmbedBuilder()
      .setTitle("✅ Member Unbanned")
      .setColor(0x44ddaa)
      .setThumbnail(ban.user.displayAvatarURL())
      .addFields(
        { name: "User", value: `<@${ban.user.id}> (${ban.user.tag})`, inline: true },
      )
      .setFooter({ text: `ID: ${ban.user.id}` })
      .setTimestamp();
    await sendLog(client, ban.guild.id, embed);
  });

  // Nickname changed
  client.on("guildMemberUpdate", async (oldMember: GuildMember | PartialGuildMember, newMember: GuildMember) => {
    if (oldMember.nickname === newMember.nickname) return;
    const embed = new EmbedBuilder()
      .setTitle("📝 Nickname Changed")
      .setColor(0x9b59b6)
      .addFields(
        { name: "User",   value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
        { name: "Before", value: oldMember.nickname ?? "*[none]*", inline: true },
        { name: "After",  value: newMember.nickname ?? "*[removed]*", inline: true },
      )
      .setFooter({ text: `ID: ${newMember.id}` })
      .setTimestamp();
    await sendLog(client, newMember.guild.id, embed);
  });
}
