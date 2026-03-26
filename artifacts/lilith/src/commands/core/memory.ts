import { SlashCommandBuilder, CommandInteraction, EmbedBuilder } from "discord.js";
import {
  clearConversationHistory,
  getConversationSummary,
} from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";


export const data = new SlashCommandBuilder()
  .setName("memory")
  .setDescription("View or manage Lilith's memory of a user")
  .setDefaultMemberPermissions(0n)
  .addSubcommand((sub) =>
    sub
      .setName("view")
      .setDescription("See what Lilith remembers about a user")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to inspect (defaults to you)").setRequired(false)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("clear")
      .setDescription("Wipe Lilith's memory of a user")
      .addUserOption((opt) =>
        opt.setName("user").setDescription("User to wipe (defaults to you)").setRequired(false)
      )
  );

export async function execute(interaction: CommandInteraction) {
  if (!interaction.guildId) return;
  const sub = (interaction.options as any).getSubcommand();
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "No.", flags: 64 });
  }

  const targetUser = (interaction.options as any).getUser("user") ?? interaction.user;

  if (sub === "view") {
    const rows = await getConversationSummary(interaction.guildId, targetUser.id);

    if (rows.length === 0) {
      return interaction.reply({
        content: `No memory stored for **${targetUser.username}** in this server.`,
        flags: 64,
      });
    }

    const lines = rows.map((r) => {
      const ts = new Date(r.created_at).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      });
      const label = r.role === "user" ? "**Them:**" : "**Lilith:**";
      const snippet = r.content.length > 120 ? r.content.slice(0, 120) + "…" : r.content;
      return `\`${ts}\` ${label} ${snippet}`;
    });

    const chunks: string[] = [];
    let current = "";
    for (const line of lines) {
      if ((current + line + "\n").length > 1900) {
        chunks.push(current);
        current = "";
      }
      current += line + "\n";
    }
    if (current) chunks.push(current);

    const embed = new EmbedBuilder()
      .setTitle(`Lilith's memory of ${targetUser.username}`)
      .setDescription(chunks[0])
      .setColor(0x9b59b6)
      .setFooter({ text: `${rows.length} messages stored` });

    await interaction.reply({ embeds: [embed], flags: 64 });
    for (let i = 1; i < chunks.length; i++) {
      await interaction.followUp({ content: chunks[i], flags: 64 });
    }
  }

  if (sub === "clear") {
    const deleted = await clearConversationHistory(interaction.guildId, targetUser.id);
    await interaction.reply({
      content: deleted > 0
        ? `🧠 Cleared ${deleted} message${deleted !== 1 ? "s" : ""} of memory for **${targetUser.username}**.`
        : `No memory found for **${targetUser.username}**.`,
      flags: 64,
    });
  }
}
