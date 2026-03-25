import {
  SlashCommandBuilder,
  CommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const data = new SlashCommandBuilder()
  .setName("create")
  .setDescription("Generate an image with AI")
  .addStringOption((opt) =>
    opt
      .setName("type")
      .setDescription("What to create")
      .setRequired(true)
      .addChoices({ name: "image", value: "image" })
  )
  .addStringOption((opt) =>
    opt.setName("prompt").setDescription("Description of what to create").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();
  const type = (interaction.options as any).getString("type", true);
  const prompt = (interaction.options as any).getString("prompt", true);

  if (type === "image") {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      });
      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) throw new Error("No image returned");
      await interaction.editReply({ content: `🎨 *"${prompt}"*\n${imageUrl}` });
    } catch (err) {
      await interaction.editReply("Image generation failed. The void rejected your prompt.");
    }
  }
}
