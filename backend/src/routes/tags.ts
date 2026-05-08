import { Hono } from "hono";
import { getDb } from "../db";

export const tags = new Hono();

// GET /api/tags
tags.get("/", (c) => {
  const db = getDb();
  const rows = db.query("SELECT t.*, COUNT(bt.bookmark_id) as count FROM tags t LEFT JOIN bookmark_tags bt ON bt.tag_id = t.id GROUP BY t.id ORDER BY t.name").all();
  return c.json({ data: rows });
});

// DELETE /api/tags/:id
tags.delete("/:id", (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const existing = db.query("SELECT id FROM tags WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);
  db.run("DELETE FROM tags WHERE id = ?", [id]);
  return c.json({ success: true });
});
