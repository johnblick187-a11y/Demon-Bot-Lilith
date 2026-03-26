import { SlashCommandBuilder, EmbedBuilder, CommandInteraction } from "discord.js";
import { askLilith } from "../../lib/ai.js";
import { getRelation } from "../../lib/db.js";
import { OWNER_ID } from "../../lib/constants.js";

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY;

async function braveSearch(query: string): Promise<string> {
  if (!BRAVE_API_KEY) throw new Error("No Brave API key");

  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`;
  const res = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "Accept-Encoding": "gzip",
      "X-Subscription-Token": BRAVE_API_KEY,
    },
  });

  if (!res.ok) throw new Error(`Brave search failed: ${res.status}`);

  const data = await res.json() as any;
  const results = data?.web?.results ?? [];

  if (results.length === 0) return "No results found.";

  return results
    .slice(0, 5)
    .map((r: any, i: number) => `[${i + 1}] **${r.title}**\n${r.description ?? ""}\n${r.url}`)
    .join("\n\n");
}

export const data = new SlashCommandBuilder()
  .setName("google")
  .setDescription("Have Lilith search the web")
  .addStringOption((opt) =>
    opt.setName("query").setDescription("What to search for").setRequired(true)
  );

export async function execute(interaction: CommandInteraction) {
  await interaction.deferReply();
  const query = (interaction.options as any).getString("query", true) as string;
  const userId = interaction.user.id;
  const isOwner = userId === OWNER_ID;

  const rel = isOwner
    ? { affinity: 100, annoyance: 0, enemy: false }
    : await getRelation(userId, interaction.user.username);

  let searchContext = "";
  try {
    const results = await braveSearch(query);
    searchContext = `\n\nHere are the real web search results for "${query}":\n\n${results}\n\nSummarize these results in your own voice. Be informative but stay in character. If results are useful, reference them. If they're garbage, say so.`;
  } catch {
    searchContext = `\n\nWeb search is down. Answer from your own knowledge about: "${query}". Note if you're unsure about recent info.`;
  }

  const response = await askLilith(
    `Search query: "${query}"${searchContext}`,
    {
      userId,
      username: interaction.user.username,
      affinity: rel.affinity,
      annoyance: rel.annoyance,
      isOwner,
      mode: "task",
      enemy: (rel as any).enemy ?? false,
    }
  );

  const embed = new EmbedBuilder()
    .setTitle(`🔍 ${query}`)
    .setColor(0x8b0000)
    .setDescription(response)
    .setFooter({ text: "Lilith Search — powered by Brave" });

  await interaction.editReply({ embeds: [embed] });
}
