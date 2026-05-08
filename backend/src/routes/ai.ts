import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { getAiSettings, setAiSettings } from "../config";
import { createProvider } from "../ai";
import { fetchPageContent } from "../services/fetcher";
import { generateSummary, suggestTags } from "../services/ai-service";
import { generateEmbedding } from "../services/embeddings";
import { getDb } from "../db";

export const ai = new Hono();

// Middleware — check AI is configured
ai.use("*", async (c, next) => {
  const settings = getAiSettings();
  if (!settings) {
    return c.json({ error: "AI not configured. Run: bm config set-ai" }, 400);
  }
  c.set("aiSettings", settings);
  await next();
});

// POST /api/ai/summarize — Summarize a URL
ai.post("/summarize", zValidator("json", z.object({ url: z.string().url() })), async (c) => {
  const { url } = c.req.valid("json");
  const settings = c.get("aiSettings");

  try {
    const content = await fetchPageContent(url);
    const ai = createProvider(settings);
    const summary = await generateSummary(ai, url, content.title, content.text);

    return c.json({
      data: {
        summary,
        title: content.title,
        description: content.description,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// POST /api/ai/smart-tag — Suggest tags for a URL
ai.post("/smart-tag", zValidator("json", z.object({ url: z.string().url() })), async (c) => {
  const { url } = c.req.valid("json");
  const settings = c.get("aiSettings");

  try {
    const content = await fetchPageContent(url);
    const ai = createProvider(settings);
    const tags = await suggestTags(ai, url, content.title, content.text);

    return c.json({ data: { tags } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// POST /api/ai/auto-bookmark — Fetch, summarize, tag, and bookmark in one call
ai.post("/auto-bookmark", zValidator("json", z.object({ url: z.string().url(), collectionId: z.string().optional() })), async (c) => {
  const { url, collectionId } = c.req.valid("json");
  const settings = c.get("aiSettings");

  try {
    const content = await fetchPageContent(url);
    const ai = createProvider(settings);

    const [summary, tags] = await Promise.all([
      generateSummary(ai, url, content.title, content.text),
      suggestTags(ai, url, content.title, content.text),
    ]);

    // Save bookmark
    const db = getDb();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.run(
      `INSERT INTO bookmarks (id, url, title, description, notes, summary, platform, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'other', ?, ?)`,
      [id, url, content.title, content.description, "", summary, now, now]
    );

    for (const tagName of tags) {
      let tag = db.query("SELECT id FROM tags WHERE name = ?").get(tagName) as { id: string } | undefined;
      if (!tag) {
        const tagId = crypto.randomUUID();
        db.run("INSERT INTO tags (id, name) VALUES (?, ?)", [tagId, tagName]);
        tag = { id: tagId };
      }
      db.run("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)", [id, tag.id]);
    }

    if (collectionId) {
      db.run("INSERT OR IGNORE INTO collection_bookmarks (collection_id, bookmark_id, position) VALUES (?, ?, 0)", [collectionId, id]);
    }

    const bookmark = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id);

    return c.json({ data: { ...bookmark, tags } }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// POST /api/ai/embed — Generate and store embedding for a bookmark
ai.post("/embed/:id", async (c) => {
  const { id } = c.req.param();
  const settings = c.get("aiSettings");
  const db = getDb();

  const row = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return c.json({ error: "Not found" }, 404);

  const text = [row.title, row.description, row.notes, row.summary].filter(Boolean).join(" ");
  if (!text) return c.json({ error: "No content to embed" }, 400);

  try {
    const ai = createProvider(settings);
    const embedding = await generateEmbedding(ai, text);
    db.run("UPDATE bookmarks SET embedding = ? WHERE id = ?", [JSON.stringify(embedding), id]);

    return c.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

// POST /api/ai/search — Semantic search
ai.post("/search", zValidator("json", z.object({ query: z.string(), limit: z.number().optional() })), async (c) => {
  const { query, limit = 10 } = c.req.valid("json");
  const settings = c.get("aiSettings");
  const db = getDb();

  try {
    const ai = createProvider(settings);
    const queryEmbedding = await generateEmbedding(ai, query);
    if (!queryEmbedding.length) return c.json({ error: "Failed to generate embedding" }, 500);

    const rows = db.query("SELECT id, title, url, description, summary, embedding FROM bookmarks WHERE embedding IS NOT NULL").all() as Array<Record<string, unknown>>;

    const scored = rows
      .map((row) => {
        const emb = JSON.parse(row.embedding as string);
        const sim = cosineSimilarity(queryEmbedding, emb);
        return { ...row, score: sim };
      })
      .filter((r) => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ embedding, ...rest }) => rest);

    return c.json({ data: scored });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: msg }, 500);
  }
});

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
