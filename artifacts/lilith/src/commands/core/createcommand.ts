import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("create")
  .setDescription("Generate an AI image")
  .addSubcommand((sub) =>
    sub
      .setName("image")
      .setDescription("Generate an image with DALL-E 3")
      .addStringOption((opt) =>
        opt.setName("prompt").setDescription("What to generate").setRequired(true)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction: CommandInteraction) {
  const sub = (interaction.options as any).getSubcommand() as string;

  if (sub === "image") {
    await interaction.deferReply();
    const prompt = (interaction.options as any).getString("prompt", true) as string;
    try {
      const { default: OpenAI } = await import("openai");
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "url",
      });
      const imageUrl = response.data?.[0]?.url;
      if (!imageUrl) throw new Error("No image returned");
      return interaction.editReply({ content: `🎨 *"${prompt}"*\n${imageUrl}` });
    } catch {
      return interaction.editReply("Image generation failed. The void rejected your prompt.");
    }
  }
}
