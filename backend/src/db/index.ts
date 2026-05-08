import { Database } from "bun:sqlite";
import { SCHEMA } from "./schema";

let db: Database;

export function getDb(): Database {
  if (!db) {
    db = new Database("bookmarks.db");
    db.exec("PRAGMA journal_mode=WAL");
    db.exec("PRAGMA foreign_keys=ON");
    db.exec(SCHEMA);
  }
  return db;
}
