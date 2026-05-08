import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CreateProjectSchema, UpdateProjectSchema, AddBookmarkToProjectSchema } from "@bookmark-rebalancer/shared";
import { getDb } from "../db";
import crypto from "node:crypto";

export const projects = new Hono();

// GET /api/projects — List all projects
projects.get("/", (c) => {
  const db = getDb();
  const status = c.req.query("status");
  const search = c.req.query("search");

  let where = "WHERE 1=1";
  const params: unknown[] = [];

  if (status) {
    where += " AND p.status = ?";
    params.push(status);
  }
  if (search) {
    where += " AND p.name LIKE ?";
    params.push(`%${search}%`);
  }

  const rows = db.query(
    `SELECT p.*,
       (SELECT COUNT(*) FROM project_bookmarks WHERE project_id = p.id) as bookmark_count,
       (SELECT COUNT(*) FROM schedule_entries WHERE project_id = p.id AND completed = 1) as completed_entries,
       (SELECT COUNT(*) FROM schedule_entries WHERE project_id = p.id) as total_entries
     FROM projects p ${where} ORDER BY p.priority DESC, p.created_at DESC`
  ).all(...params);

  return c.json({ data: rows });
});

// POST /api/projects — Create project
projects.post("/", zValidator("json", CreateProjectSchema), (c) => {
  const db = getDb();
  const input = c.req.valid("json");
  const id = crypto.randomUUID();

  db.run(
    "INSERT INTO projects (id, name, description, status, priority, deadline) VALUES (?, ?, ?, ?, ?, ?)",
    [id, input.name, input.description, input.status, input.priority, input.deadline || null]
  );

  const row = db.query("SELECT * FROM projects WHERE id = ?").get(id);
  return c.json({ data: row }, 201);
});

// GET /api/projects/:id — Get single project with bookmarks
projects.get("/:id", (c) => {
  const db = getDb();
  const { id } = c.req.param();

  const row = db.query(
    `SELECT p.*,
       (SELECT COUNT(*) FROM project_bookmarks WHERE project_id = p.id) as bookmark_count,
       (SELECT COUNT(*) FROM schedule_entries WHERE project_id = p.id AND completed = 1) as completed_entries,
       (SELECT COUNT(*) FROM schedule_entries WHERE project_id = p.id) as total_entries
     FROM projects p WHERE p.id = ?`
  ).get(id) as Record<string, unknown> | undefined;

  if (!row) return c.json({ error: "Not found" }, 404);

  const bookmarks = db.query(
    `SELECT b.* FROM bookmarks b
     JOIN project_bookmarks pb ON pb.bookmark_id = b.id
     WHERE pb.project_id = ?
     ORDER BY b.created_at DESC`
  ).all(id);

  return c.json({ data: { ...row, bookmarks } });
});

// PUT /api/projects/:id — Update project
projects.put("/:id", zValidator("json", UpdateProjectSchema), (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const input = c.req.valid("json");

  const existing = db.query("SELECT id FROM projects WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const fields: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(`${key} = ?`);
      params.push(value);
    }
  }

  if (fields.length > 0) {
    params.push(id);
    db.run(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  const row = db.query("SELECT * FROM projects WHERE id = ?").get(id);
  return c.json({ data: row });
});

// DELETE /api/projects/:id — Delete project
projects.delete("/:id", (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const existing = db.query("SELECT id FROM projects WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  db.run("DELETE FROM projects WHERE id = ?", [id]);
  return c.json({ success: true });
});

// POST /api/projects/:id/bookmarks — Add bookmark to project
projects.post("/:id/bookmarks", zValidator("json", AddBookmarkToProjectSchema), (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const { bookmarkId } = c.req.valid("json");

  const project = db.query("SELECT id FROM projects WHERE id = ?").get(id);
  if (!project) return c.json({ error: "Project not found" }, 404);

  const bookmark = db.query("SELECT id FROM bookmarks WHERE id = ?").get(bookmarkId);
  if (!bookmark) return c.json({ error: "Bookmark not found" }, 404);

  db.run("INSERT OR IGNORE INTO project_bookmarks (project_id, bookmark_id) VALUES (?, ?)", [id, bookmarkId]);
  return c.json({ success: true }, 201);
});

// DELETE /api/projects/:id/bookmarks/:bookmarkId — Remove bookmark from project
projects.delete("/:id/bookmarks/:bookmarkId", (c) => {
  const db = getDb();
  const { id, bookmarkId } = c.req.param();

  db.run("DELETE FROM project_bookmarks WHERE project_id = ? AND bookmark_id = ?", [id, bookmarkId]);
  return c.json({ success: true });
});
