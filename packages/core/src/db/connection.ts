import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export interface DatabaseOptions {
  /** Path to SQLite database file. Defaults to AUTOTASK_DB_PATH env var or "./autotask.db" */
  dbPath?: string;
}

/**
 * Creates a Drizzle ORM database instance backed by better-sqlite3.
 * Pass ":memory:" as dbPath for in-memory databases (useful for testing).
 */
export function createDatabase(options: DatabaseOptions = {}) {
  const dbPath =
    options.dbPath ?? process.env["AUTOTASK_DB_PATH"] ?? "./autotask.db";
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type AppDatabase = ReturnType<typeof createDatabase>;
