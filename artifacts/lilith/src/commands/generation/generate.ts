import {
  SlashCommandBuilder,
  CommandInteraction,
  AttachmentBuilder,
} from "discord.js";
import Replicate from "replicate";
import https from "https";
import http from "http";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

function downloadBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    }).on("error", reject);
  });
}

export const data = new SlashCommandBuilder()
  .setName("generate")
  .setDescription("Generate AI video or music from a prompt")
  .addSubcommand((sub) =>
    sub
      .setName("video")
      .setDescription("Generate a 6s AI video from a text prompt")
      .addStringOption((opt) =>
        opt
          .setName("prompt")
          .setDescription("Describe the video you want")
          .setRequired(true)
      )
  )
  .addSubcommand((sub) =>
    sub
      .setName("music")
      .setDescription("Generate a song from a text prompt")
      .addStringOption((opt) =>
        opt
          .setName("prompt")
          .setDescription("Describe the music you want (style, mood, genre, etc.)")
          .setRequired(true)
      )
      .addBooleanOption((opt) =>
        opt
          .setName("vocals")
          .setDescription("Include vocals? (default: no)")
          .setRequired(false)
      )
      .addIntegerOption((opt) =>
        opt
          .setName("duration")
          .setDescription("Length in seconds, up to 3:30 (210s) — default 30s")
          .setRequired(false)
          .setMinValue(1)
          .setMaxValue(210)
      )
  );

export async function execute(interaction: CommandInteraction) {
  const sub = (interaction.options as any).getSubcommand() as string;
  const prompt = (interaction.options as any).getString("prompt", true) as string;

  await interaction.deferReply();

  if (sub === "video") {
    await interaction.editReply(`🎬 Generating a 6s video for *"${prompt}"*… this takes ~60-90 seconds.`);

    try {
      const output = await replicate.run(
        "minimax/video-01:5aa835260ff7f40f4069c41185f72036accf99e29957bb4a3b3a911f3b6c1912",
        {
          input: {
            prompt,
            prompt_optimizer: true,
          },
        }
      );

      let videoUrl: string | null = null;
      if (typeof output === "string") {
        videoUrl = output;
      } else if (Array.isArray(output) && typeof output[0] === "string") {
        videoUrl = output[0];
      } else if (output && typeof (output as any).url === "function") {
        videoUrl = (output as any).url().href;
      } else if (output && typeof (output as any).url === "string") {
        videoUrl = (output as any).url;
      }

      if (!videoUrl) throw new Error("No video URL returned");

      const buf = await downloadBuffer(videoUrl);
      const attachment = new AttachmentBuilder(buf, { name: "generated.mp4" });

      await interaction.editReply({
        content: `🎬 *"${prompt}"*`,
        files: [attachment],
      });
    } catch (err: any) {
      console.error("Video generation error:", err);
      await interaction.editReply(`Video generation failed — ${err?.message ?? "unknown error"}.`);
    }
  } else if (sub === "music") {
    const vocals = (interaction.options as any).getBoolean("vocals") as boolean | null ?? false;
    const musicDuration = ((interaction.options as any).getInteger("duration") as number | null) ?? 30;

    await interaction.editReply(
      `🎵 Generating ${musicDuration}s ${vocals ? "song with vocals" : "instrumental"} for *"${prompt}"*… this takes ~30-90 seconds.`
    );

    try {
      const output = await replicate.run(
        "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
        {
          input: {
            prompt: vocals ? prompt : `${prompt}, instrumental, no vocals`,
            model_version: "stereo-large",
            output_format: "mp3",
            normalization_strategy: "peak",
            duration: musicDuration,
          },
        }
      );

      let audioUrl: string | null = null;
      if (typeof output === "string") {
        audioUrl = output;
      } else if (Array.isArray(output) && typeof output[0] === "string") {
        audioUrl = output[0];
      } else if (output && typeof (output as any).url === "function") {
        audioUrl = (output as any).url().href;
      } else if (output && typeof (output as any).url === "string") {
        audioUrl = (output as any).url;
      }

      if (!audioUrl) throw new Error("No audio URL returned");

      const buf = await downloadBuffer(audioUrl);
      const attachment = new AttachmentBuilder(buf, { name: "generated.mp3" });

      await interaction.editReply({
        content: `🎵 *"${prompt}"* ${vocals ? "(with vocals)" : "(instrumental)"}`,
        files: [attachment],
      });
    } catch (err: any) {
      console.error("Music generation error:", err);
      await interaction.editReply(`Music generation failed — ${err?.message ?? "unknown error"}.`);
    }
  }
}
