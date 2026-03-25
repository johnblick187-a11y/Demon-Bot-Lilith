import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("channel")
  .setDescription("Manage channels")
  .addStringOption((opt) =>
    opt
      .setName("type")
      .setDescription("Channel type")
      .setRequired(true)
      .addChoices({ name: "text", value: "text" }, { name: "voice", value: "voice" })
  )
  .addStringOption((opt) =>
    opt
      .setName("action")
      .setDescription("Action to perform")
      .setRequired(true)
      .addChoices(
        { name: "create", value: "create" },
        { name: "delete", value: "delete" },
        { name: "lock", value: "lock" }
      )
  )
  .addStringOption((opt) => opt.setName("name").setDescription("Channel name").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels);

export async function execute(interaction: CommandInteraction) {
  const type = (interaction.options as any).getString("type", true);
  const action = (interaction.options as any).getString("action", true);
  const name = (interaction.options as any).getString("name") ?? "new-channel";

  if (action === "create") {
    const channelType = type === "text" ? ChannelType.GuildText : ChannelType.GuildVoice;
    const ch = await interaction.guild?.channels.create({ name, type: channelType });
    await interaction.reply(`✅ Created ${type} channel **${ch?.name}**.`);
  } else if (action === "delete") {
    const ch = interaction.guild?.channels.cache.find((c) => c.name === name);
    if (!ch) return interaction.reply({ content: "Channel not found.", ephemeral: true });
    await ch.delete();
    await interaction.reply(`🗑️ Deleted channel **${name}**.`);
  } else if (action === "lock") {
    const ch = interaction.channel as TextChannel;
    await ch.permissionOverwrites.edit(interaction.guild!.roles.everyone, { SendMessages: false });
    await interaction.reply(`🔒 Channel locked.`);
  }
}
