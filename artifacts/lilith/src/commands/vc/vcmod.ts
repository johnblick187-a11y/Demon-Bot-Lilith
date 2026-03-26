import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  GuildMember,
  VoiceChannel,
} from "discord.js";

export const vcmoveData = new SlashCommandBuilder()
  .setName("vcmove")
  .setDescription("Move a user to another voice channel")
  .addUserOption((opt) => opt.setName("user").setDescription("User to move").setRequired(true))
  .addChannelOption((opt) => opt.setName("destination").setDescription("Destination VC").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeVcmove(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const dest = (interaction.options as any).getChannel("destination", true);
  const member = interaction.guild?.members.cache.get(target.id);

  if (!member) return interaction.reply({ content: "User not found.", flags: 64 });
  await member.voice.setChannel(dest.id);
  await interaction.reply(`🔀 Moved **${target.username}** to **${dest.name}**.`);
}

export const vcmuteData = new SlashCommandBuilder()
  .setName("vcmute")
  .setDescription("Server mute a user in VC")
  .addUserOption((opt) => opt.setName("user").setDescription("User to mute").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeVcmute(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const member = interaction.guild?.members.cache.get(target.id);
  if (!member) return interaction.reply({ content: "User not found.", flags: 64 });
  await member.voice.setMute(true);
  await interaction.reply(`🔇 **${target.username}** has been muted.`);
}

export const vcunmuteData = new SlashCommandBuilder()
  .setName("vcunmute")
  .setDescription("Remove server mute from a user")
  .addUserOption((opt) => opt.setName("user").setDescription("User to unmute").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeVcunmute(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const member = interaction.guild?.members.cache.get(target.id);
  if (!member) return interaction.reply({ content: "User not found.", flags: 64 });
  await member.voice.setMute(false);
  await interaction.reply(`🔊 **${target.username}** has been unmuted.`);
}

export const vcdeafenData = new SlashCommandBuilder()
  .setName("vcdeafen")
  .setDescription("Server deafen a user in VC")
  .addUserOption((opt) => opt.setName("user").setDescription("User to deafen").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeVcdeafen(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const member = interaction.guild?.members.cache.get(target.id);
  if (!member) return interaction.reply({ content: "User not found.", flags: 64 });
  await member.voice.setDeaf(true);
  await interaction.reply(`🙉 **${target.username}** has been deafened.`);
}

export const vcundeafenData = new SlashCommandBuilder()
  .setName("vcundeafen")
  .setDescription("Remove server deafen from a user")
  .addUserOption((opt) => opt.setName("user").setDescription("User to undeafen").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeVcundeafen(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const member = interaction.guild?.members.cache.get(target.id);
  if (!member) return interaction.reply({ content: "User not found.", flags: 64 });
  await member.voice.setDeaf(false);
  await interaction.reply(`👂 **${target.username}** has been undeafened.`);
}
