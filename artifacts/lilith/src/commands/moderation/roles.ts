import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  Role,
} from "discord.js";

export const makeroleData = new SlashCommandBuilder()
  .setName("makerole")
  .setDescription("Create a new role")
  .addStringOption((opt) => opt.setName("name").setDescription("Role name").setRequired(true))
  .addStringOption((opt) => opt.setName("color").setDescription("Hex color e.g. #ff0000").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeMakerole(interaction: CommandInteraction) {
  const name = (interaction.options as any).getString("name", true);
  const color = (interaction.options as any).getString("color") ?? "#000000";

  const role = await interaction.guild?.roles.create({
    name,
    color: color as `#${string}`,
  });

  await interaction.reply(`✅ Role **${role?.name}** created.`);
}

export const editroleData = new SlashCommandBuilder()
  .setName("editrole")
  .setDescription("Edit an existing role name/color")
  .addRoleOption((opt) => opt.setName("role").setDescription("Role to edit").setRequired(true))
  .addStringOption((opt) => opt.setName("name").setDescription("New name").setRequired(false))
  .addStringOption((opt) => opt.setName("color").setDescription("New hex color").setRequired(false))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeEditrole(interaction: CommandInteraction) {
  const role = (interaction.options as any).getRole("role", true) as Role;
  const name = (interaction.options as any).getString("name");
  const color = (interaction.options as any).getString("color");

  const guildRole = interaction.guild?.roles.cache.get(role.id);
  if (!guildRole) return interaction.reply({ content: "Role not found.", flags: 64 });

  await guildRole.edit({
    name: name ?? guildRole.name,
    color: color ? (color as `#${string}`) : guildRole.color,
  });

  await interaction.reply(`✏️ Role **${guildRole.name}** updated.`);
}

export const deleteroleData = new SlashCommandBuilder()
  .setName("deleterole")
  .setDescription("Delete a role")
  .addRoleOption((opt) => opt.setName("role").setDescription("Role to delete").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeDeleterole(interaction: CommandInteraction) {
  const role = (interaction.options as any).getRole("role", true) as Role;
  const guildRole = interaction.guild?.roles.cache.get(role.id);
  if (!guildRole) return interaction.reply({ content: "Role not found.", flags: 64 });

  const name = guildRole.name;
  await guildRole.delete();
  await interaction.reply(`🗑️ Role **${name}** deleted.`);
}
