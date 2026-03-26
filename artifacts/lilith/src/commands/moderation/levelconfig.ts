import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
  TextChannel,
} from "discord.js";
import {
  setLevelChannel,
  disableLevelChannel,
  addLevelRole,
  removeLevelRole,
  getLevelRoles,
  setUserXp,
  resetUserXp,
  resetAllXp,
} from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("levelconfig")
  .setDescription("Configure the leveling system")

  .addSubcommand((s) =>
    s.setName("setchannel")
      .setDescription("Set the channel for level-up announcements")
      .addChannelOption((o) => o.setName("channel").setDescription("Channel").setRequired(true))
  )
  .addSubcommand((s) =>
    s.setName("disablechannel")
      .setDescription("Disable level-up announcements")
  )
  .addSubcommand((s) =>
    s.setName("addrole")
      .setDescription("Assign a role when a user reaches a level")
      .addIntegerOption((o) => o.setName("level").setDescription("Level required").setRequired(true).setMinValue(1))
      .addRoleOption((o) => o.setName("role").setDescription("Role to assign").setRequired(true))
  )
  .addSubcommand((s) =>
    s.setName("removerole")
      .setDescription("Remove a level role reward")
      .addIntegerOption((o) => o.setName("level").setDescription("Level to remove").setRequired(true).setMinValue(1))
  )
  .addSubcommand((s) =>
    s.setName("listroles")
      .setDescription("List all level role rewards")
  )
  .addSubcommand((s) =>
    s.setName("setxp")
      .setDescription("Manually set a user's XP (owner only)")
      .addUserOption((o) => o.setName("user").setDescription("User").setRequired(true))
      .addIntegerOption((o) => o.setName("xp").setDescription("XP amount").setRequired(true).setMinValue(0))
  )
  .addSubcommand((s) =>
    s.setName("resetxp")
      .setDescription("Reset XP for a user or the whole server (owner only)")
      .addUserOption((o) => o.setName("user").setDescription("Leave empty to reset everyone").setRequired(false))
  )

  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;
  const sub = (interaction.options as any).getSubcommand();
  const opts = interaction.options as any;
  const isOwner = interaction.user.id === OWNER_ID;

  if (sub === "setchannel") {
    await interaction.deferReply({ flags: 64 });
    const channel = opts.getChannel("channel", true) as TextChannel;
    await setLevelChannel(interaction.guild.id, channel.id);
    return interaction.editReply(`✅ Level-up announcements will be sent to <#${channel.id}>.`);
  }

  if (sub === "disablechannel") {
    await interaction.deferReply({ flags: 64 });
    await disableLevelChannel(interaction.guild.id);
    return interaction.editReply("✅ Level-up announcements disabled.");
  }

  if (sub === "addrole") {
    await interaction.deferReply({ flags: 64 });
    const level = opts.getInteger("level", true) as number;
    const role = opts.getRole("role", true);
    await addLevelRole(interaction.guild.id, level, role.id);
    return interaction.editReply(`✅ <@&${role.id}> will be given at level **${level}**.`);
  }

  if (sub === "removerole") {
    await interaction.deferReply({ flags: 64 });
    const level = opts.getInteger("level", true) as number;
    await removeLevelRole(interaction.guild.id, level);
    return interaction.editReply(`✅ Level **${level}** role reward removed.`);
  }

  if (sub === "listroles") {
    await interaction.deferReply({ flags: 64 });
    const rows = await getLevelRoles(interaction.guild.id);
    if (rows.length === 0) return interaction.editReply("No level role rewards configured.");
    const lines = rows.map((r: any) => `Level **${r.level}** → <@&${r.role_id}>`);
    const embed = new EmbedBuilder()
      .setTitle("Level Role Rewards")
      .setDescription(lines.join("\n"))
      .setColor(0x2ecc71);
    return interaction.editReply({ embeds: [embed] });
  }

  if (sub === "setxp") {
    if (!isOwner) return interaction.reply({ content: "Owner only.", flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const target = opts.getUser("user", true);
    const xp = opts.getInteger("xp", true) as number;
    await setUserXp(interaction.guild.id, target.id, xp);
    return interaction.editReply(`✅ Set <@${target.id}>'s XP to **${xp.toLocaleString()}**.`);
  }

  if (sub === "resetxp") {
    if (!isOwner) return interaction.reply({ content: "Owner only.", flags: 64 });
    await interaction.deferReply({ flags: 64 });
    const target = opts.getUser("user") ?? null;
    if (target) {
      await resetUserXp(interaction.guild.id, target.id);
      return interaction.editReply(`✅ Reset <@${target.id}>'s XP.`);
    } else {
      await resetAllXp(interaction.guild.id);
      return interaction.editReply("✅ Reset XP for the entire server.");
    }
  }
}
