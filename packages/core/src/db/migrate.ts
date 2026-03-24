import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { AppDatabase } from "./connection.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Default path to the drizzle migrations folder (relative to dist/db/) */
const DEFAULT_MIGRATIONS_PATH = path.resolve(__dirname, "../../drizzle");

/**
 * Run pending Drizzle migrations against the given database.
 */
export function runMigrations(
  db: AppDatabase,
  migrationsFolder: string = DEFAULT_MIGRATIONS_PATH,
) {
  migrate(db, { migrationsFolder });
}
