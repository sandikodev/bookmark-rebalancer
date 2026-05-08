import { AiProvider } from "../ai/provider";

export async function generateSummary(
  ai: AiProvider,
  url: string,
  title: string,
  text: string
): Promise<string> {
  const prompt = `Summarize this web page in 2-3 sentences:

URL: ${url}
Title: ${title}
Content:
${text.slice(0, 4000)}

Provide a concise summary:`;

  return ai.chat([
    { role: "system", content: "You summarize web pages briefly and accurately." },
    { role: "user", content: prompt },
  ]);
}

export async function suggestTags(
  ai: AiProvider,
  url: string,
  title: string,
  text: string
): Promise<string[]> {
  const prompt = `Suggest 3-5 relevant tags (single words or short phrases) for bookmarking this web page:

URL: ${url}
Title: ${title}
Content:
${text.slice(0, 3000)}

Return only the tags as a comma-separated list, nothing else. Example: "ai, web, typescript"`;

  const result = await ai.chat([
    {
      role: "system",
      content: "You suggest relevant tags for bookmarking web pages. Return only comma-separated tags.",
    },
    { role: "user", content: prompt },
  ]);

  return result
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length > 0);
}
