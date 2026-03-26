import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";

export const avatarData = new SlashCommandBuilder()
  .setName("avatar")
  .setDescription("Get a user's avatar")
  .addUserOption((opt) => opt.setName("user").setDescription("User").setRequired(false));

export async function executeAvatar(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user") ?? interaction.user;
  const embed = new EmbedBuilder()
    .setTitle(`🖼️ ${target.username}'s Avatar`)
    .setImage(target.displayAvatarURL({ size: 512 }))
    .setColor(0x8b0000);
  await interaction.reply({ embeds: [embed] });
}

export const bannerData = new SlashCommandBuilder()
  .setName("banner")
  .setDescription("Get a user's banner")
  .addUserOption((opt) => opt.setName("user").setDescription("User").setRequired(false));

export async function executeBanner(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user") ?? interaction.user;
  const fetched = await target.fetch();
  const bannerUrl = fetched.bannerURL({ size: 512 });

  if (!bannerUrl) {
    return interaction.reply({ content: `**${target.username}** has no banner. Tragic.`, flags: 64 });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎨 ${target.username}'s Banner`)
    .setImage(bannerUrl)
    .setColor(0x8b0000);
  await interaction.reply({ embeds: [embed] });
}
