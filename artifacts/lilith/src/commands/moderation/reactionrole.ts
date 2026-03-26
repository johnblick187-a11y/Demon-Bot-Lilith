import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import {
  addReactionRole,
  removeReactionRole,
  getReactionRoles,
} from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("reactionrole")
  .setDescription("Manage reaction roles")

  .addSubcommand((s) =>
    s.setName("add")
      .setDescription("Add a reaction role to a message")
      .addStringOption((o) => o.setName("message_id").setDescription("ID of the message").setRequired(true))
      .addStringOption((o) => o.setName("emoji").setDescription("Emoji to react with").setRequired(true))
      .addRoleOption((o) => o.setName("role").setDescription("Role to assign").setRequired(true))
      .addChannelOption((o) => o.setName("channel").setDescription("Channel the message is in (defaults to current)").setRequired(false))
  )

  .addSubcommand((s) =>
    s.setName("remove")
      .setDescription("Remove a reaction role")
      .addStringOption((o) => o.setName("message_id").setDescription("Message ID").setRequired(true))
      .addStringOption((o) => o.setName("emoji").setDescription("Emoji to remove").setRequired(true))
  )

  .addSubcommand((s) =>
    s.setName("list")
      .setDescription("List all reaction roles in this server")
  )

  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  const sub = (interaction.options as any).getSubcommand();
  const opts = interaction.options as any;

  if (sub === "add") {
    await interaction.deferReply({ flags: 64 });

    const messageId = opts.getString("message_id", true) as string;
    const emoji = opts.getString("emoji", true) as string;
    const role = opts.getRole("role", true);
    const channelOpt = opts.getChannel("channel") as TextChannel | null;
    const channel = (channelOpt ?? interaction.channel) as TextChannel;

    if (!channel || typeof channel.messages?.fetch !== "function") {
      return interaction.editReply("Can't find that channel.");
    }

    let message;
    try {
      message = await channel.messages.fetch(messageId);
    } catch {
      return interaction.editReply("Couldn't find that message. Make sure the ID is correct and the channel is right.");
    }

    try {
      await message.react(emoji);
    } catch {
      return interaction.editReply("Couldn't react with that emoji — it may be invalid or from a server I'm not in.");
    }

    await addReactionRole(interaction.guild.id, channel.id, messageId, emoji, role.id);

    return interaction.editReply(`✅ Done. Anyone who reacts with ${emoji} on that message will get <@&${role.id}>.`);
  }

  if (sub === "remove") {
    await interaction.deferReply({ flags: 64 });

    const messageId = opts.getString("message_id", true) as string;
    const emoji = opts.getString("emoji", true) as string;

    await removeReactionRole(interaction.guild.id, messageId, emoji);
    return interaction.editReply(`✅ Reaction role removed.`);
  }

  if (sub === "list") {
    await interaction.deferReply({ flags: 64 });

    const rows = await getReactionRoles(interaction.guild.id);
    if (rows.length === 0) {
      return interaction.editReply("No reaction roles set up in this server.");
    }

    const lines = rows.map((r: any) =>
      `• ${r.emoji} → <@&${r.role_id}> on [message](https://discord.com/channels/${interaction.guild!.id}/${r.channel_id}/${r.message_id})`
    );

    const embed = new EmbedBuilder()
      .setTitle("Reaction Roles")
      .setDescription(lines.join("\n").slice(0, 4096))
      .setColor(0xe74c3c)
      .setFooter({ text: `${rows.length} reaction role(s)` });

    return interaction.editReply({ embeds: [embed] });
  }
}
