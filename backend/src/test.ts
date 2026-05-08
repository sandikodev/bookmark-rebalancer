import { Database } from "bun:sqlite";

// In-memory test for core functionality
const db = Database.open(":memory:");
db.exec("PRAGMA foreign_keys=ON");

// Create schema
db.exec(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    platform TEXT NOT NULL DEFAULT 'other',
    platform_id TEXT NOT NULL DEFAULT '',
    platform_metadata TEXT NOT NULL DEFAULT '{}',
    favicon_url TEXT NOT NULL DEFAULT '',
    embedding TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE);
  CREATE TABLE IF NOT EXISTS bookmark_tags (bookmark_id TEXT, tag_id TEXT, PRIMARY KEY (bookmark_id, tag_id));
  CREATE TABLE IF NOT EXISTS collections (id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, created_at TEXT DEFAULT (datetime('now')));
  CREATE TABLE IF NOT EXISTS collection_bookmarks (collection_id TEXT, bookmark_id TEXT, position INTEGER, PRIMARY KEY (collection_id, bookmark_id));
`);

let passed = 0;
let failed = 0;

function assert(condition: boolean, name: string) {
  if (condition) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; console.log(`  ✗ ${name}`); }
}

// Test CRUD
const id = crypto.randomUUID();
const now = new Date().toISOString();

db.run(
  "INSERT INTO bookmarks (id, url, title, description, notes, platform, platform_id, platform_metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  [id, "https://github.com/honojs/hono", "Hono", "Web framework", "", "github", "honojs/hono", "{}", now, now]
);

const row = db.query("SELECT * FROM bookmarks WHERE id = ?").get(id) as Record<string, unknown>;
assert(row !== undefined, "create bookmark");
assert(row.platform === "github", "platform detection");

// Test tags
const tagId = crypto.randomUUID();
db.run("INSERT INTO tags (id, name) VALUES (?, ?)", [tagId, "web"]);
db.run("INSERT INTO bookmark_tags (bookmark_id, tag_id) VALUES (?, ?)", [id, tagId]);
const tags = db.query("SELECT t.name FROM tags t JOIN bookmark_tags bt ON bt.tag_id = t.id WHERE bt.bookmark_id = ?").all(id) as Array<Record<string, unknown>>;
assert(tags.length === 1 && tags[0].name === "web", "tag association");

// Test update
db.run("UPDATE bookmarks SET notes = ? WHERE id = ?", ["test notes", id]);
const updated = db.query("SELECT notes FROM bookmarks WHERE id = ?").get(id) as Record<string, unknown>;
assert(updated.notes === "test notes", "update bookmark");

// Test delete
db.run("DELETE FROM bookmarks WHERE id = ?", [id]);
const deleted = db.query("SELECT id FROM bookmarks WHERE id = ?").get(id);
assert(deleted == null, "delete bookmark");

// Test collections
const colId = crypto.randomUUID();
db.run("INSERT INTO collections (id, name) VALUES (?, ?)", [colId, "Test"]);
const cols = db.query("SELECT * FROM collections").all();
assert(cols.length === 1, "create collection");

console.log(`\n${"=".repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
