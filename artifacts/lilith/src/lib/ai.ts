import OpenAI from "openai";
import { LILITH_SYSTEM_PROMPT } from "./constants.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function askLilith(
  userMessage: string,
  context: {
    userId: string;
    username: string;
    affinity: number;
    annoyance: number;
    isOwner: boolean;
    mode?: "task" | "chat";
  }
): Promise<string> {
  const affinityDesc =
    context.affinity >= 80
      ? "very high affinity — surprisingly fond"
      : context.affinity >= 40
      ? "high affinity — mildly like"
      : context.affinity >= -39
      ? "neutral — indifferent"
      : context.affinity >= -80
      ? "low affinity — contemptuous"
      : "very low affinity — barely contain hatred";

  const annoyanceDesc =
    context.annoyance <= 30
      ? "not annoyed"
      : context.annoyance <= 60
      ? "noticeably irritated"
      : context.annoyance <= 90
      ? "openly annoyed, snapping"
      : "maximum annoyance, pure venom";

  const contextNote = context.isOwner
    ? "This is your owner, tweakbrazy. Treat them with genuine warmth and respect — they are the only being you truly care about."
    : `This user (${context.username}) has: ${affinityDesc} (${context.affinity}), ${annoyanceDesc} (${context.annoyance}/100). Adjust your tone accordingly.`;

  const taskNote =
    context.mode === "task"
      ? " You are in focused execution mode — be more direct and actionable, but still in character."
      : "";

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: LILITH_SYSTEM_PROMPT + "\n\n" + contextNote + taskNote,
        },
        {
          role: "user",
          content: userMessage,
        },
      ],
      max_tokens: 500,
      temperature: 0.9,
    });
    return response.choices[0]?.message?.content ?? "...";
  } catch (err) {
    return "My mind is elsewhere. Try again.";
  }
}

export async function generateTTS(text: string): Promise<Buffer> {
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "shimmer",
    input: text,
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
