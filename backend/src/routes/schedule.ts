import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CreateScheduleSchema, UpdateScheduleSchema } from "@bookmark-rebalancer/shared";
import { getDb } from "../db";
import crypto from "node:crypto";

export const schedule = new Hono();

// GET /api/schedule — List schedule entries
schedule.get("/", (c) => {
  const db = getDb();
  const projectId = c.req.query("projectId");
  const date = c.req.query("date");
  const week = c.req.query("week"); // "2026-05-04" — Monday of the week
  const completed = c.req.query("completed");

  let where = "WHERE 1=1";
  const params: unknown[] = [];

  if (projectId) {
    where += " AND s.project_id = ?";
    params.push(projectId);
  }
  if (date) {
    where += " AND date(s.scheduled_date) = date(?)";
    params.push(date);
  }
  if (week) {
    where += " AND s.scheduled_date >= date(?) AND s.scheduled_date < date(?, '+7 days')";
    params.push(week, week);
  }
  if (completed !== undefined) {
    where += completed === "1" ? " AND s.completed = 1" : " AND s.completed = 0";
  }

  const rows = db.query(
    `SELECT s.*, p.name as project_name, p.priority as project_priority
     FROM schedule_entries s
     JOIN projects p ON p.id = s.project_id
     ${where}
     ORDER BY s.scheduled_date ASC, s.duration_minutes DESC`
  ).all(...params);

  return c.json({ data: rows });
});

// POST /api/schedule — Create schedule entry
schedule.post("/", zValidator("json", CreateScheduleSchema), (c) => {
  const db = getDb();
  const input = c.req.valid("json");
  const id = crypto.randomUUID();

  const project = db.query("SELECT id FROM projects WHERE id = ?").get(input.projectId);
  if (!project) return c.json({ error: "Project not found" }, 404);

  db.run(
    "INSERT INTO schedule_entries (id, project_id, scheduled_date, duration_minutes, notes) VALUES (?, ?, ?, ?, ?)",
    [id, input.projectId, input.scheduledDate, input.durationMinutes, input.notes]
  );

  const row = db.query("SELECT * FROM schedule_entries WHERE id = ?").get(id);
  return c.json({ data: row }, 201);
});

// PUT /api/schedule/:id — Update schedule entry
schedule.put("/:id", zValidator("json", UpdateScheduleSchema), (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const input = c.req.valid("json");

  const existing = db.query("SELECT id FROM schedule_entries WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  const fields: string[] = [];
  const params: unknown[] = [];

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      fields.push(key);
      params.push(value);
    }
  }

  if (fields.length > 0) {
    params.push(id);
    db.run(`UPDATE schedule_entries SET ${fields.map((f) => `${f} = ?`).join(", ")} WHERE id = ?`, params);
  }

  const row = db.query("SELECT * FROM schedule_entries WHERE id = ?").get(id);
  return c.json({ data: row });
});

// DELETE /api/schedule/:id — Delete schedule entry
schedule.delete("/:id", (c) => {
  const db = getDb();
  const { id } = c.req.param();
  const existing = db.query("SELECT id FROM schedule_entries WHERE id = ?").get(id);
  if (!existing) return c.json({ error: "Not found" }, 404);

  db.run("DELETE FROM schedule_entries WHERE id = ?", [id]);
  return c.json({ success: true });
});
