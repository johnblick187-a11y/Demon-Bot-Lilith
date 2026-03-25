import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
} from "discord.js";
import { addLockedCustomCommand, getGuildPrefix } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("create")
  .setDescription("Generate an AI image or create a custom server command")
  .addSubcommand((sub) =>
    sub
      .setName("image")
      .setDescription("Generate an image with DALL-E 3")
      .addStringOption((opt) =>
        opt
          .setName("prompt")
          .setDescription("What to generate")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("custom-command")
      .setDescription(
        "Create a custom command with a locked prefix and once-per-day usage limit per user"
      )
      .addStringOption((opt) =>
        opt
          .setName("name")
          .setDescription("Command name (letters, numbers, underscores only)")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("effect")
          .setDescription("What Lilith responds with when this command is triggered")
          .setRequired(true)
      )
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

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

  if (sub === "custom-command") {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server-only command.", ephemeral: true });
    }

    const name = (interaction.options as any).getString("name", true) as string;
    const effect = (interaction.options as any).getString("effect", true) as string;

    const cleanName = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!cleanName) {
      return interaction.reply({
        content: "Invalid command name. Use letters, numbers, and underscores only.",
        ephemeral: true,
      });
    }

    const currentPrefix = await getGuildPrefix(interaction.guildId);
    await addLockedCustomCommand(interaction.guildId, cleanName, effect, currentPrefix);

    await interaction.reply(
      `✅ Custom command \`${currentPrefix}${cleanName}\` created.\n` +
      `**Effect:** ${effect}\n\n` +
      `**Prefix locked to:** \`${currentPrefix}\` *(changing the server prefix won't affect this command)*\n` +
      `**Daily limit:** Each user can trigger this command once per day.\n\n` +
      `Type \`${currentPrefix}${cleanName}\` in any channel to use it.`
    );
  }
}
