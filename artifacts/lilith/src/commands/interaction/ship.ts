import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ship")
  .setDescription("Ship two users together")
  .addUserOption((opt) =>
    opt.setName("user1").setDescription("First user").setRequired(true)
  )
  .addUserOption((opt) =>
    opt.setName("user2").setDescription("Second user").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  const u1 = (interaction.options as any).getUser("user1", true);
  const u2 = (interaction.options as any).getUser("user2", true);

  const score = Math.floor(Math.random() * 101);
  const bar = "❤️".repeat(Math.floor(score / 10)) + "🖤".repeat(10 - Math.floor(score / 10));

  let verdict = "";
  if (score >= 90) verdict = "Disgustingly compatible. Get a room.";
  else if (score >= 70) verdict = "Actually not terrible together.";
  else if (score >= 50) verdict = "Could work. Could also crash and burn.";
  else if (score >= 30) verdict = "Questionable at best.";
  else verdict = "This is a disaster waiting to happen.";

  const shipName =
    u1.username.slice(0, Math.ceil(u1.username.length / 2)) +
    u2.username.slice(Math.floor(u2.username.length / 2));

  const embed = new EmbedBuilder()
    .setTitle(`💘 ${u1.username} × ${u2.username}`)
    .setColor(0x8b0000)
    .setDescription(`**Ship Name:** ${shipName}\n\n${bar}\n\n**${score}%** — ${verdict}`)
    .setFooter({ text: "Don't blame me when this implodes." });

  await interaction.reply({ embeds: [embed] });
}
