import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("webhook")
  .setDescription("Manage webhooks in this server")

  .addSubcommand((s) =>
    s.setName("create")
      .setDescription("Create a webhook in a channel")
      .addChannelOption((o) => o.setName("channel").setDescription("Channel to create webhook in").setRequired(true))
      .addStringOption((o) => o.setName("name").setDescription("Webhook name").setRequired(true))
      .addStringOption((o) => o.setName("avatar").setDescription("Avatar URL for the webhook").setRequired(false))
  )

  .addSubcommand((s) =>
    s.setName("list")
      .setDescription("List all webhooks in this server or a specific channel")
      .addChannelOption((o) => o.setName("channel").setDescription("Filter by channel (optional)").setRequired(false))
  )

  .addSubcommand((s) =>
    s.setName("delete")
      .setDescription("Delete a webhook by ID")
      .addStringOption((o) => o.setName("id").setDescription("Webhook ID").setRequired(true))
      .addStringOption((o) => o.setName("reason").setDescription("Reason").setRequired(false))
  )

  .addSubcommand((s) =>
    s.setName("send")
      .setDescription("Send a message through a webhook")
      .addStringOption((o) => o.setName("id").setDescription("Webhook ID").setRequired(true))
      .addStringOption((o) => o.setName("message").setDescription("Message content").setRequired(true))
      .addStringOption((o) => o.setName("username").setDescription("Override display name").setRequired(false))
      .addStringOption((o) => o.setName("avatar").setDescription("Override avatar URL").setRequired(false))
  )

  .addSubcommand((s) =>
    s.setName("info")
      .setDescription("Get details about a webhook")
      .addStringOption((o) => o.setName("id").setDescription("Webhook ID").setRequired(true))
  )

  .setDefaultMemberPermissions(0n);

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "Not for you.", flags: 64 });
  }
  if (!interaction.guild) return;
  const sub = (interaction.options as any).getSubcommand();
  const opts = interaction.options as any;

  if (sub === "create") {
    await interaction.deferReply({ flags: 64 });
    const channel = opts.getChannel("channel", true) as TextChannel;
    const name = opts.getString("name", true) as string;
    const avatar = opts.getString("avatar") as string | null;

    if (!channel || typeof channel.createWebhook !== "function") {
      return interaction.editReply("That channel doesn't support webhooks.");
    }

    try {
      const webhook = await channel.createWebhook({
        name,
        ...(avatar ? { avatar } : {}),
        reason: `Created by ${interaction.user.username} via /webhook`,
      });
      const embed = new EmbedBuilder()
        .setTitle("Webhook Created")
        .setColor(0x2ecc71)
        .addFields(
          { name: "Name", value: webhook.name, inline: true },
          { name: "ID", value: webhook.id, inline: true },
          { name: "Channel", value: `<#${channel.id}>`, inline: true },
          { name: "URL", value: `\`${webhook.url}\`` }
        );
      return interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      return interaction.editReply(`❌ Failed to create webhook: ${err?.message ?? "unknown error"}`);
    }
  }

  if (sub === "list") {
    await interaction.deferReply({ flags: 64 });
    const filterChannel = opts.getChannel("channel") as TextChannel | null;

    const webhooks = await interaction.guild.fetchWebhooks();
    const filtered = filterChannel
      ? webhooks.filter((w) => w.channelId === filterChannel.id)
      : webhooks;

    if (filtered.size === 0) {
      return interaction.editReply(filterChannel ? `No webhooks in <#${filterChannel.id}>.` : "No webhooks in this server.");
    }

    const lines = filtered.map((w) => {
      const channel = w.channelId ? `<#${w.channelId}>` : "Unknown";
      const creator = w.owner ? `by ${(w.owner as any).username ?? "unknown"}` : "";
      return `• \`${w.id}\` **${w.name}** → ${channel} ${creator}`;
    });

    const embed = new EmbedBuilder()
      .setTitle(`Webhooks${filterChannel ? ` in #${filterChannel.name}` : ""}`)
      .setDescription(lines.join("\n").slice(0, 4096))
      .setColor(0x3498db)
      .setFooter({ text: `${filtered.size} webhook(s)` });

    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "delete") {
    await interaction.deferReply({ flags: 64 });
    const id = opts.getString("id", true) as string;
    const reason = opts.getString("reason") as string | null;

    try {
      const webhook = await interaction.client.fetchWebhook(id);
      await webhook.delete(reason ?? `Deleted by ${interaction.user.username} via /webhook`);
      return interaction.editReply(`✅ Webhook \`${id}\` deleted.`);
    } catch (err: any) {
      return interaction.editReply(`❌ Failed: ${err?.message ?? "Webhook not found or no permission."}`);
    }
  }

  if (sub === "send") {
    await interaction.deferReply({ flags: 64 });
    const id = opts.getString("id", true) as string;
    const message = opts.getString("message", true) as string;
    const username = opts.getString("username") as string | null;
    const avatar = opts.getString("avatar") as string | null;

    try {
      const webhook = await interaction.client.fetchWebhook(id);
      await webhook.send({
        content: message,
        ...(username ? { username } : {}),
        ...(avatar ? { avatarURL: avatar } : {}),
      });
      return interaction.editReply("✅ Message sent.");
    } catch (err: any) {
      return interaction.editReply(`❌ Failed: ${err?.message ?? "Webhook not found or no permission."}`);
    }
  }

  if (sub === "info") {
    await interaction.deferReply({ flags: 64 });
    const id = opts.getString("id", true) as string;

    try {
      const webhook = await interaction.client.fetchWebhook(id);
      const embed = new EmbedBuilder()
        .setTitle(`Webhook: ${webhook.name}`)
        .setColor(0x9b59b6)
        .addFields(
          { name: "ID", value: webhook.id, inline: true },
          { name: "Type", value: String(webhook.type), inline: true },
          { name: "Channel", value: webhook.channelId ? `<#${webhook.channelId}>` : "N/A", inline: true },
          { name: "Created By", value: (webhook.owner as any)?.username ?? "Unknown", inline: true },
          { name: "URL", value: `\`${webhook.url}\`` }
        );
      if (webhook.avatar) embed.setThumbnail(webhook.avatarURL() ?? "");
      return interaction.editReply({ embeds: [embed] });
    } catch (err: any) {
      return interaction.editReply(`❌ Failed: ${err?.message ?? "Webhook not found."}`);
    }
  }
}
