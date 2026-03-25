import { SlashCommandBuilder, EmbedBuilder, CommandInteraction, Client } from "discord.js";
import { getRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("status")
  .setDescription("Show Lilith's current status");

export async function execute(interaction: CommandInteraction, client: Client) {
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const embed = new EmbedBuilder()
    .setTitle("👁️ Lilith — Status")
    .setColor(0x8b0000)
    .addFields(
      { name: "Uptime", value: `${hours}h ${minutes}m`, inline: true },
      { name: "Ping", value: `${client.ws.ping}ms`, inline: true },
      { name: "Guilds", value: `${client.guilds.cache.size}`, inline: true },
      { name: "Status", value: "Operational. Unfortunately.", inline: false }
    )
    .setFooter({ text: "Lilith — Demon Bot" })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}
