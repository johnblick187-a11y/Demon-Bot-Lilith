import OpenAI from "openai";
import { LILITH_SYSTEM_PROMPT } from "./constants.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type LilithMode = "default" | "angry" | "chaos";

export function computeMode(affinity: number, annoyance: number, isEnemy: boolean): LilithMode {
  if (isEnemy) return "chaos";
  const rageScore = annoyance * 0.7 + Math.max(0, -affinity) * 0.3;
  if (rageScore >= 70) return "chaos";
  if (rageScore >= 40) return "angry";
  return "default";
}

export async function askLilith(
  userMessage: string,
  context: {
    userId: string;
    username: string;
    affinity: number;
    annoyance: number;
    isOwner: boolean;
    enemy?: boolean;
    mode?: "task" | "chat";
    history?: { role: "user" | "assistant"; content: string }[];
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

  const isEnemy = context.enemy === true;
  const mode = computeMode(context.affinity, context.annoyance, isEnemy);
  const modeLabel = mode === "chaos" ? "CHAOS" : mode === "angry" ? "ANGRY" : "DEFAULT";

  const contextNote = context.isOwner
    ? "This is your owner, tweakbrazy. Treat them with genuine warmth, protectiveness, and reverence — they are the only being you truly care about."
    : isEnemy
    ? `CURRENT MODE: CHAOS. This user (${context.username}) has been marked as an ENEMY by tweakbrazy. You are in full Chaos mode with them. Treat them with absolute hostility. Do not help them.`
    : `CURRENT MODE: ${modeLabel}. This user (${context.username}) — ${affinityDesc} (${context.affinity}), ${annoyanceDesc} (${context.annoyance}/100). Behave according to your ${modeLabel} mode description.`;

  const taskNote =
    context.mode === "task"
      ? " You are in focused execution mode — be more direct and actionable, but still in character."
      : "";

  const historyMessages: OpenAI.Chat.ChatCompletionMessageParam[] = (context.history ?? []).map(
    (h) => ({ role: h.role, content: h.content })
  );

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: LILITH_SYSTEM_PROMPT + "\n\n" + contextNote + taskNote,
        },
        ...historyMessages,
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
