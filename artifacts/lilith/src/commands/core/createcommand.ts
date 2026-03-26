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
        opt.setName("prompt").setDescription("What to generate").setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("custom-command")
      .setDescription("Create a custom command with a designed effect")
      .addStringOption((opt) =>
        opt.setName("name").setDescription("Command name (letters, numbers, underscores)").setRequired(true)
      )
      .addStringOption((opt) =>
        opt
          .setName("type")
          .setDescription("How the command responds")
          .setRequired(true)
          .addChoices(
            { name: "text — plain message", value: "text" },
            { name: "embed — formatted card", value: "embed" },
            { name: "action — italic third-person action (*Lilith does X*)", value: "action" }
          )
      )
      .addStringOption((opt) =>
        opt
          .setName("content")
          .setDescription("The response text. Use {user} to mention whoever triggers the command")
          .setRequired(true)
      )
      .addStringOption((opt) =>
        opt.setName("title").setDescription("Embed title (embed type only)").setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName("color").setDescription("Embed color as hex e.g. #8b0000 (embed type only)").setRequired(false)
      )
      .addStringOption((opt) =>
        opt.setName("image").setDescription("Image URL to attach (any type)").setRequired(false)
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

  if (sub === "custom-command") {
    if (!interaction.guildId) return interaction.reply({ content: "Server-only.", flags: 64 });

    const name    = (interaction.options as any).getString("name", true) as string;
    const type    = (interaction.options as any).getString("type", true) as "text" | "embed" | "action";
    const content = (interaction.options as any).getString("content", true) as string;
    const title   = (interaction.options as any).getString("title") as string | null;
    const color   = (interaction.options as any).getString("color") as string | null;
    const image   = (interaction.options as any).getString("image") as string | null;

    const cleanName = name.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!cleanName) {
      return interaction.reply({ content: "Invalid command name. Letters, numbers, underscores only.", flags: 64 });
    }

    let parsedColor: number | null = null;
    if (color) {
      const hex = color.replace(/^#/, "");
      parsedColor = parseInt(hex, 16);
      if (isNaN(parsedColor)) {
        return interaction.reply({ content: "Invalid hex color. Use format like `#8b0000`.", flags: 64 });
      }
    }

    if (image) {
      try { new URL(image); } catch {
        return interaction.reply({ content: "Invalid image URL.", flags: 64 });
      }
    }

    const prefix = await getGuildPrefix(interaction.guildId);

    await addLockedCustomCommand(interaction.guildId, cleanName, content, prefix, {
      effect_type: type,
      embed_title: title ?? null,
      embed_color: parsedColor !== null ? parsedColor.toString() : null,
      image_url: image ?? null,
    });

    const typeLabels: Record<string, string> = {
      text: "📝 Plain text",
      embed: "🃏 Embed card",
      action: "⚡ Action (*italics*)",
    };

    const lines = [
      `✅ **\`${prefix}${cleanName}\`** created.`,
      `**Type:** ${typeLabels[type]}`,
      `**Content:** ${content}`,
    ];
    if (title) lines.push(`**Embed Title:** ${title}`);
    if (color) lines.push(`**Color:** ${color}`);
    if (image) lines.push(`**Image:** ${image}`);
    lines.push(`\nType \`${prefix}${cleanName}\` in any channel to use it. Use \`{user}\` in content to mention someone.`);

    await interaction.reply(lines.join("\n"));
  }
}
