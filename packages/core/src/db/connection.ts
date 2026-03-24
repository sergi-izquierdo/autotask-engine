import Database from "better-sqlite3";
import { drizzle, BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type DrizzleDB = BetterSQLite3Database<typeof schema>;

const CREATE_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    schedule TEXT NOT NULL,
    handler TEXT NOT NULL,
    config TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`;

const CREATE_TASK_RUNS_TABLE = `
  CREATE TABLE IF NOT EXISTS task_runs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL REFERENCES tasks(id),
    status TEXT NOT NULL DEFAULT 'pending',
    started_at INTEGER,
    finished_at INTEGER,
    result TEXT,
    error TEXT,
    created_at INTEGER NOT NULL
  )
`;

export function createDatabase(filepath?: string): DrizzleDB {
  const sqlite = filepath ? new Database(filepath) : new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  sqlite.exec(CREATE_TASKS_TABLE);
  sqlite.exec(CREATE_TASK_RUNS_TABLE);

  return drizzle(sqlite, { schema });
}
