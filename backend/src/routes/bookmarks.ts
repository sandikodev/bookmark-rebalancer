import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { CreateBookmarkSchema, UpdateBookmarkSchema } from "@bookmark-rebalancer/shared";
import { getDb } from "../db";
import { detectPlatform } from "../services/platform";
import crypto from "node:crypto";

export const bookmarks = new Hono();

// POST /api/bookmarks — Create bookmark
bookmarks.post("/", zValidator("json", CreateBookmarkSchema), async (c) => {
  const input = c.req.valid("json");
  const db = getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const platformInfo = detectPlatform(input.url);

  const platform = input.platform !== "other" ? input.platform : platformInfo.platform;
  const platformId = input.platformId || platformInfo.platformId;
  const platformMetadata = {
    ...platformInfo.platformMetadata,
    ...input.platformMetadata,
  };

  db.run(
    `INSERT INTO bookmarks (id, url, title, description, notes, platform, platform_id, platform_metadata, favicon_url, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      input.url,
      input.title,
      input.description,
      input.notes,
      platform,
      platformId,
      JSON.stringify(platformMetadata),
      input.faviconUrl,
      now,
      now,
    ]
  );

  // Handle tags
  for (const tagName of input.tags) {
    let tag = db.query("SELECT id FROM tags WHERE name = ?").get(tagName) as { id: string } | undefined;
    if (!tag) {
      const tagId = crypto.randomUUID();
      db.run("INSERT INTO tags (id, name) VALUES (?, ?)", [tagId, tagName]);
      tag = { id: tagId };
    }
    db.run("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)", [id, tag.id]);
  }

  // Handle collection
  if (input.collectionId) {
    const maxPos = db.query("SELECT COALESCE(MAX(position), -1) + 1 as pos FROM collection_bookmarks WHERE collection_id = ?")
      .get(input.collectionId) as { pos: number };
    db.run(
      "INSERT OR IGNORE INTO collection_bookmarks (collection_id, bookmark_id, position) VALUES (?, ?, ?)",
      [input.collectionId, id, maxPos.pos]
    );
  }

  const bookmark = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as Record<string, unknown>;
  bookmark.platform_metadata = JSON.parse(bookmark.platform_metadata as string);

  return c.json({ data: bookmark }, 201);
});

// GET /api/bookmarks — List bookmarks
bookmarks.get("/", async (c) => {
  const db = getDb();
  const tag = c.req.query("tag");
  const collectionId = c.req.query("collectionId");
  const platform = c.req.query("platform");
  const projectId = c.req.query("projectId");
  const search = c.req.query("search");
  const page = Math.max(1, parseInt(c.req.query("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(c.req.query("limit") || "20")));
  const offset = (page - 1) * limit;

  let where = "WHERE 1=1";
  const params: unknown[] = [];

  if (tag) {
    where += " AND b.id IN (SELECT bookmark_id FROM bookmark_tags bt JOIN tags t ON bt.tag_id = t.id WHERE t.name = ?)";
    params.push(tag);
  }
  if (collectionId) {
    where += " AND b.id IN (SELECT bookmark_id FROM collection_bookmarks WHERE collection_id = ?)";
    params.push(collectionId);
  }
  if (platform) {
    where += " AND b.platform = ?";
    params.push(platform);
  }
  if (projectId) {
    where += " AND b.id IN (SELECT bookmark_id FROM project_bookmarks WHERE project_id = ?)";
    params.push(projectId);
  }
  if (search) {
    where += " AND (b.title LIKE ? OR b.description LIKE ? OR b.url LIKE ?)";
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const total = db.query(`SELECT COUNT(*) as count FROM bookmarks b ${where}`).get(...params) as { count: number };
  const rows = db.query(
    `SELECT b.* FROM bookmarks b ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Record<string, unknown>[];

  const data = rows.map((row) => ({
    ...row,
    platform_metadata: JSON.parse(row.platform_metadata as string),
  }));

  return c.json({ data, total: total.count, page, limit });
});

// GET /api/bookmarks/:id — Get single bookmark
bookmarks.get("/:id", async (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const row = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return c.json({ error: "Not found" }, 404);

  row.platform_metadata = JSON.parse(row.platform_metadata as string);
  const tags = db.query(
    "SELECT t.* FROM tags t JOIN bookmark_tags bt ON bt.tag_id = t.id WHERE bt.bookmark_id = ?"
  ).all(id);

  return c.json({ data: { ...row, tags } });
});

// PUT /api/bookmarks/:id — Update bookmark
bookmarks.put("/:id", zValidator("json", UpdateBookmarkSchema), async (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const input = c.req.valid("json");

  const existing = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const fields: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (key === "tags" || key === "collectionId") continue;
    if (value !== undefined) {
      const col = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`);
      fields.push(`${col} = ?`);
      params.push(typeof value === "object" ? JSON.stringify(value) : value);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_at = ?");
    params.push(new Date().toISOString());
    params.push(id);
    db.run(`UPDATE bookmarks SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  // Update tags if provided
  if (input.tags) {
    db.run("DELETE FROM bookmark_tags WHERE bookmark_id = ?", [id]);
    for (const tagName of input.tags) {
      let tag = db.query("SELECT id FROM tags WHERE name = ?").get(tagName) as { id: string } | undefined;
      if (!tag) {
        const tagId = crypto.randomUUID();
        db.run("INSERT INTO tags (id, name) VALUES (?, ?)", [tagId, tagName]);
        tag = { id: tagId };
      }
      db.run("INSERT OR IGNORE INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)", [id, tag.id]);
    }
  }

  const updated = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as Record<string, unknown>;
  updated.platform_metadata = JSON.parse(updated.platform_metadata as string);

  return c.json({ data: updated });
});

// DELETE /api/bookmarks/:id — Delete bookmark
bookmarks.delete("/:id", async (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const existing = db.query("SELECT id FROM bookmarks WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  db.run("DELETE FROM bookmarks WHERE id = ?", [id]);
  return c.json({ success: true });
});
