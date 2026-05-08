import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CreateCollectionSchema } from "@bookmark-rebalancer/shared";
import { getDb } from "../db";
import crypto from "node:crypto";

export const collections = new Hono();

// GET /api/collections
collections.get("/", (c) => {
  const db = getDb();
  const rows = db.query(
    "SELECT c.*, (SELECT COUNT(*) FROM collection_bookmarks WHERE collection_id = c.id) as item_count FROM collections c ORDER BY c.name"
  ).all();
  return c.json({ data: rows });
});

// POST /api/collections
collections.post("/", zValidator("json", CreateCollectionSchema), (c) => {
  const db = getDb();
  const input = c.req.valid("json");
  const id = crypto.randomUUID();

  db.run(
    "INSERT INTO collections (id, name, parent_id) VALUES (?, ?, ?)",
    [id, input.name, input.parentId || null]
  );

  const row = db.query("SELECT * FROM collections WHERE id = ?").get(id);
  return c.json({ data: row }, 201);
});

// PUT /api/collections/:id
collections.put("/:id", zValidator("json", CreateCollectionSchema.partial()), (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const input = c.req.valid("json");

  const existing = db.query("SELECT id FROM collections WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  if (input.name !== undefined) {
    db.run("UPDATE collections SET name = ? WHERE id = ?", [input.name, id]);
  }
  if (input.parentId !== undefined) {
    db.run("UPDATE collections SET parent_id = ? WHERE id = ?", [input.parentId || null, id]);
  }

  const row = db.query("SELECT * FROM collections WHERE id = ?").get(id);
  return c.json({ data: row });
});

// DELETE /api/collections/:id
collections.delete("/:id", (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const existing = db.query("SELECT id FROM collections WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  db.run("DELETE FROM collections WHERE id = ?", [id]);
  return c.json({ success: true });
});
