import {
  SlashCommandBuilder,
  CommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { generateTTS } from "../../lib/ai.js";
import { OWNER_ID } from "../../lib/constants.js";

export const data = new SlashCommandBuilder()
  .setName("tts")
  .setDescription("Convert text to speech (Lilith's voice)")
  .addStringOption((opt) =>
    opt.setName("text").setDescription("Text to speak").setRequired(true)
  )
  .setDefaultMemberPermissions(0n);

export async function execute(interaction: CommandInteraction) {
  if (interaction.user.id !== OWNER_ID) {
    return interaction.reply({ content: "Not for you.", flags: 64 });
  }

  await interaction.deferReply();
  const text = (interaction.options as any).getString("text", true);

  try {
    const audioBuffer = await generateTTS(text);
    const attachment = new AttachmentBuilder(audioBuffer, { name: "lilith_tts.mp3" });
    await interaction.editReply({ content: `🎙️ *"${text}"*`, files: [attachment] });
  } catch (err) {
    await interaction.editReply("TTS failed. My voice is too powerful for this system.");
  }
}
