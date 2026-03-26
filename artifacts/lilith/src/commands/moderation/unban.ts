import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  ActionRowBuilder,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("unban")
  .setDescription("Select users from the ban list to unban")
  .addStringOption((opt) =>
    opt.setName("reason").setDescription("Reason for unban").setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guild) return;

  await interaction.deferReply({ flags: 64 });

  const bans = await interaction.guild.bans.fetch();

  if (bans.size === 0) {
    return interaction.editReply("No banned users in this server.");
  }

  const reason = ((interaction.options as any).getString("reason") ?? "No reason given.").slice(0, 70);

  // Discord select menus support max 25 options
  const options = bans
    .first(25)
    .map((ban) =>
      new StringSelectMenuOptionBuilder()
        .setLabel(ban.user.username.slice(0, 100))
        .setDescription(`ID: ${ban.user.id}${ban.reason ? ` · ${ban.reason.slice(0, 50)}` : ""}`)
        .setValue(ban.user.id)
    );

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`unban_select:${reason}`)
    .setPlaceholder(`Select users to unban (${bans.size} banned${bans.size > 25 ? ", showing first 25" : ""})`)
    .setMinValues(1)
    .setMaxValues(options.length)
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);

  await interaction.editReply({ content: "Select who to unban:", components: [row] });
}
