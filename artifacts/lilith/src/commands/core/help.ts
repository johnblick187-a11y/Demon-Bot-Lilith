import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("help")
  .setDescription("Command information")
  .addStringOption((opt) =>
    opt.setName("command").setDescription("Specific command to look up").setRequired(false)
  );

const COMMAND_LIST = `
**⚙️ Core:** /status /diagnostics /help /mood /annoyance /affinity

**🧠 AI:** /ask /task /tldr /nsfwtoggle /google

**😈 Interaction:** /punch /slap /bite /headbutt /stab /shoot /roast /pickup /ship /smash /blow

**🚨 Moderation:** /ban /kick /warn /timeout /rename /makerole /editrole /deleterole /purge /channel /avatar /banner /info /autoreact /autoreply

**🌿 Fun:** /hitsmeth /hitsweed /chugsdrink /popspill

**🎨 Generation:** /create /tts

**🎧 VC Core:** /join /leave
**🎵 Music:** /play /pause /resume /skip /stop /queue
**🔧 VC Mod:** /vcmove /vcmute /vcunmute /vcdeafen /vcundeafen
`;

export async function execute(interaction: CommandInteraction) {
  const embed = new EmbedBuilder()
    .setTitle("😈 Lilith — Command List")
    .setColor(0x8b0000)
    .setDescription(COMMAND_LIST)
    .setFooter({ text: "Don't test me." });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
