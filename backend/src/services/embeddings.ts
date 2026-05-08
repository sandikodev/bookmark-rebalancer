import { AiProvider } from "../ai/provider";

// Simple cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function generateEmbedding(
  ai: AiProvider,
  text: string
): Promise<number[]> {
  if (!ai.embed) {
    throw new Error("AI provider does not support embeddings");
  }
  return ai.embed(text);
}

export function searchByEmbedding(
  queryEmbedding: number[],
  items: Array<{ id: string; embedding: number[] }>,
  topK: number = 10
): Array<{ id: string; score: number }> {
  const scored = items
    .map((item) => ({
      id: item.id,
      score: cosineSimilarity(queryEmbedding, item.embedding),
    }))
    .filter((item) => item.score > 0.3)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  return scored;
}

export { cosineSimilarity };
