import {
  SlashCommandBuilder,
  CommandInteraction,
  PermissionFlagsBits,
  EmbedBuilder,
} from "discord.js";
import { addCustomCommand, getCustomCommands } from "../../lib/db.js";

export const data = new SlashCommandBuilder()
  .setName("create")
  .setDescription("Create a custom prefix command or generate AI content")
  .addStringOption((opt) =>
    opt
      .setName("type")
      .setDescription("What to create")
      .setRequired(true)
      .addChoices(
        { name: "command", value: "command" },
        { name: "image", value: "image" }
      )
  )
  .addStringOption((opt) =>
    opt
      .setName("name")
      .setDescription("Command name (for 'command' type) / image prompt (for 'image' type)")
      .setRequired(true)
  )
  .addStringOption((opt) =>
    opt
      .setName("effect")
      .setDescription("What the command does — the text Lilith responds with (for 'command' type)")
      .setRequired(false)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: CommandInteraction) {
  const type = (interaction.options as any).getString("type", true) as string;

  if (type === "image") {
    await interaction.deferReply();
    const prompt = (interaction.options as any).getString("name", true) as string;
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

  if (type === "command") {
    if (!interaction.guildId) {
      return interaction.reply({ content: "Server-only command.", ephemeral: true });
    }

    const name = (interaction.options as any).getString("name", true) as string;
    const effect = (interaction.options as any).getString("effect") as string | null;

    if (!effect) {
      return interaction.reply({
        content: "You need to provide an `effect` — the text Lilith will respond with when this command is triggered.",
        ephemeral: true,
      });
    }

    const cleanName = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!cleanName) {
      return interaction.reply({ content: "Invalid command name. Use letters, numbers, and underscores.", ephemeral: true });
    }

    await addCustomCommand(interaction.guildId, cleanName, effect);

    const prefix = (await import("../../lib/db.js")).getGuildPrefix
      ? await (await import("../../lib/db.js")).getGuildPrefix(interaction.guildId)
      : "!";

    await interaction.reply(
      `✅ Custom command \`${prefix}${cleanName}\` created.\n` +
      `**Effect:** ${effect}\n\n` +
      `Type \`${prefix}${cleanName}\` in any channel to trigger it.`
    );
  }
}
