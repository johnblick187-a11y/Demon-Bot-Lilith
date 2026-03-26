import {
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
  Role,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("info")
  .setDescription("Get info about a user, server, or role")
  .addStringOption((opt) =>
    opt
      .setName("type")
      .setDescription("What to get info about")
      .setRequired(true)
      .addChoices(
        { name: "user", value: "user" },
        { name: "server", value: "server" },
        { name: "role", value: "role" }
      )
  )
  .addUserOption((opt) => opt.setName("user").setDescription("User (for user type)").setRequired(false))
  .addRoleOption((opt) => opt.setName("role").setDescription("Role (for role type)").setRequired(false));

export async function execute(interaction: CommandInteraction) {
  const type = (interaction.options as any).getString("type", true);

  if (type === "user") {
    const target = (interaction.options as any).getUser("user") ?? interaction.user;
    const member = interaction.guild?.members.cache.get(target.id);

    const embed = new EmbedBuilder()
      .setTitle(`👤 ${target.username}`)
      .setThumbnail(target.displayAvatarURL())
      .setColor(0x8b0000)
      .addFields(
        { name: "ID", value: target.id, inline: true },
        { name: "Account Created", value: `<t:${Math.floor(target.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Joined Server", value: member?.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown", inline: true },
        { name: "Roles", value: member?.roles.cache.filter(r => r.id !== interaction.guildId).map(r => r.name).join(", ") || "None", inline: false }
      );

    return interaction.reply({ embeds: [embed] });
  }

  if (type === "server") {
    const guild = interaction.guild!;
    const embed = new EmbedBuilder()
      .setTitle(`🏰 ${guild.name}`)
      .setThumbnail(guild.iconURL())
      .setColor(0x8b0000)
      .addFields(
        { name: "ID", value: guild.id, inline: true },
        { name: "Owner", value: `<@${guild.ownerId}>`, inline: true },
        { name: "Members", value: `${guild.memberCount}`, inline: true },
        { name: "Created", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:R>`, inline: true },
        { name: "Channels", value: `${guild.channels.cache.size}`, inline: true },
        { name: "Roles", value: `${guild.roles.cache.size}`, inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }

  if (type === "role") {
    const role = (interaction.options as any).getRole("role") as Role;
    if (!role) return interaction.reply({ content: "Provide a role.", flags: 64 });

    const embed = new EmbedBuilder()
      .setTitle(`🎭 ${role.name}`)
      .setColor(role.color || 0x8b0000)
      .addFields(
        { name: "ID", value: role.id, inline: true },
        { name: "Color", value: role.hexColor, inline: true },
        { name: "Members", value: `${role.members.size}`, inline: true },
        { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
        { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true }
      );
    return interaction.reply({ embeds: [embed] });
  }
}
