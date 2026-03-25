import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";
import { getRelation, markEnemy, getEnemies } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("enemy")
  .setDescription("Manage Lilith's enemy list (owner only)")
  .addSubcommand((sub) =>
    sub
      .setName("add")
      .setDescription("Mark a user as an enemy")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to mark as enemy").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("remove")
      .setDescription("Remove a user from the enemy list")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to remove").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("Show all current enemies")
  );

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({
      content: "This command is mine alone. You don't get to touch it.",
      ephemeral: true,
    });
  }

  const sub = (interaction.options as any).getSubcommand();

  if (sub === "add") {
    const target = (interaction.options as any).getUser("user", true);

    if (target.id === OWNER_ID) {
      return interaction.reply({ content: "You can't enemy yourself.", ephemeral: true });
    }

    await getRelation(target.id, target.username);
    await markEnemy(target.id, true);

    const embed = new EmbedBuilder()
      .setTitle("🩸 Enemy Added")
      .setColor(0x8b0000)
      .setDescription(`**${target.username}** has been marked as an enemy.\n\nAffinity locked at -100. Annoyance locked at 100. They will be treated accordingly.`)
      .setFooter({ text: "They had their chance." });

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "remove") {
    const target = (interaction.options as any).getUser("user", true);

    await markEnemy(target.id, false);

    const embed = new EmbedBuilder()
      .setTitle("Enemy Removed")
      .setColor(0x4a4a4a)
      .setDescription(`**${target.username}** has been removed from the enemy list.\n\nThey're still not trusted. But they're no longer a priority.`)
      .setFooter({ text: "Don't make me regret this." });

    return interaction.reply({ embeds: [embed] });
  }

  if (sub === "list") {
    const enemies = await getEnemies();

    const embed = new EmbedBuilder()
      .setTitle("🩸 Enemy List")
      .setColor(0x8b0000);

    if (enemies.length === 0) {
      embed.setDescription("No enemies marked. For now.");
    } else {
      embed.setDescription(
        enemies.map((e, i) => `${i + 1}. **${e.username ?? "Unknown"}** (${e.user_id})`).join("\n")
      );
    }

    embed.setFooter({ text: `${enemies.length} on the list.` });
    return interaction.reply({ embeds: [embed] });
  }
}
