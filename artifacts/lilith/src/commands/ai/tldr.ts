import { SlashCommandBuilder, CommandInteraction, TextChannel } from "discord.js";
import { OWNER_ID } from "../../lib/constants.js";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const data = new SlashCommandBuilder()
  .setName("tldr")
  .setDescription("Summarize the last N messages in this channel")
  .addIntegerOption((opt) =>
    opt
      .setName("messages")
      .setDescription("How many messages to summarize (default 30, max 100)")
      .setRequired(false)
      .setMinValue(5)
      .setMaxValue(100)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();

  const limit = Math.min((interaction.options as any).getInteger("messages") ?? 30, 100);
  const channel = interaction.channel as TextChannel;

  let messages;
  try {
    const fetched = await channel.messages.fetch({ limit });
    messages = [...fetched.values()].reverse().filter((m) => m.content.trim().length > 0);
  } catch {
    return interaction.editReply("Couldn't fetch messages. Check my permissions.");
  }

  if (messages.length === 0) {
    return interaction.editReply("Nothing to summarize. This channel is empty.");
  }

  const transcript = messages
    .map((m) => `${m.author.username}: ${m.content.replace(/\n+/g, " ")}`)
    .join("\n");

  const prompt = `You are Lilith — a cold, darkly intelligent, brutally honest entity. Summarize the following Discord conversation. Be concise, savage, and precise. Don't pad it. Don't be nice. If the conversation is stupid, say so. Format: a short paragraph or a few bullet points. Never more than 5 bullet points.\n\nConversation:\n${transcript}`;

  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.8,
    });

    const summary = res.choices[0]?.message?.content?.trim() ?? "I got nothing from that.";
    await interaction.editReply(`📋 **TL;DR** (last ${messages.length} messages)\n\n${summary}`);
  } catch {
    await interaction.editReply("Summarization failed. The void rejected your chat history.");
  }
}
