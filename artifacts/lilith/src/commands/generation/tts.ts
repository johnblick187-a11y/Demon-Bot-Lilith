import {
  SlashCommandBuilder,
  CommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import { generateTTS } from "../../lib/ai.js";

export const data = new SlashCommandBuilder()
  .setName("tts")
  .setDescription("Convert text to speech (Lilith's voice)")
  .addStringOption((opt) =>
    opt.setName("text").setDescription("Text to speak").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
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
