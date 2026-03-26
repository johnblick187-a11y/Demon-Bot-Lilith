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
  .setDescription("Edit an existing role name/color/position")
  .addRoleOption((opt) => opt.setName("role").setDescription("Role to edit").setRequired(true))
  .addStringOption((opt) => opt.setName("name").setDescription("New name").setRequired(false))
  .addStringOption((opt) => opt.setName("color").setDescription("New hex color").setRequired(false))
  .addIntegerOption((opt) => opt.setName("position").setDescription("New position in role hierarchy (1 = bottom)").setRequired(false).setMinValue(1))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeEditrole(interaction: CommandInteraction) {
  const role = (interaction.options as any).getRole("role", true) as Role;
  const name = (interaction.options as any).getString("name");
  const color = (interaction.options as any).getString("color");
  const position = (interaction.options as any).getInteger("position") as number | null;

  const guildRole = interaction.guild?.roles.cache.get(role.id);
  if (!guildRole) return interaction.reply({ content: "Role not found.", flags: 64 });

  await guildRole.edit({
    name: name ?? guildRole.name,
    color: color ? (color as `#${string}`) : guildRole.color,
    ...(position !== null ? { position } : {}),
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

export const giveroleData = new SlashCommandBuilder()
  .setName("giverole")
  .setDescription("Assign a role to a member")
  .addUserOption((opt) => opt.setName("user").setDescription("Member to give the role to").setRequired(true))
  .addRoleOption((opt) => opt.setName("role").setDescription("Role to assign").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeGiverole(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const role = (interaction.options as any).getRole("role", true) as Role;

  const member = await interaction.guild?.members.fetch(target.id).catch(() => null);
  if (!member) return interaction.reply({ content: "Member not found.", flags: 64 });

  const guildRole = interaction.guild?.roles.cache.get(role.id);
  if (!guildRole) return interaction.reply({ content: "Role not found.", flags: 64 });

  if (member.roles.cache.has(guildRole.id)) {
    return interaction.reply({ content: `**${member.displayName}** already has **${guildRole.name}**.`, flags: 64 });
  }

  await member.roles.add(guildRole);
  await interaction.reply(`✅ Gave **${guildRole.name}** to **${member.displayName}**.`);
}

export const removeroleData = new SlashCommandBuilder()
  .setName("removerole")
  .setDescription("Remove a role from a member")
  .addUserOption((opt) => opt.setName("user").setDescription("Member to remove the role from").setRequired(true))
  .addRoleOption((opt) => opt.setName("role").setDescription("Role to remove").setRequired(true))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function executeRemoverole(interaction: CommandInteraction) {
  const target = (interaction.options as any).getUser("user", true);
  const role = (interaction.options as any).getRole("role", true) as Role;

  const member = await interaction.guild?.members.fetch(target.id).catch(() => null);
  if (!member) return interaction.reply({ content: "Member not found.", flags: 64 });

  const guildRole = interaction.guild?.roles.cache.get(role.id);
  if (!guildRole) return interaction.reply({ content: "Role not found.", flags: 64 });

  if (!member.roles.cache.has(guildRole.id)) {
    return interaction.reply({ content: `**${member.displayName}** doesn't have **${guildRole.name}**.`, flags: 64 });
  }

  await member.roles.remove(guildRole);
  await interaction.reply(`✅ Removed **${guildRole.name}** from **${member.displayName}**.`);
}
