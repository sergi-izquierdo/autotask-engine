import type { ConnectionOptions } from "bullmq";

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
  maxRetriesPerRequest?: number | null;
}

export function getRedisConfig(): RedisConfig {
  return {
    host: process.env["REDIS_HOST"] ?? "localhost",
    port: parseInt(process.env["REDIS_PORT"] ?? "6379", 10),
    password: process.env["REDIS_PASSWORD"] ?? undefined,
    db: process.env["REDIS_DB"] ? parseInt(process.env["REDIS_DB"], 10) : 0,
    maxRetriesPerRequest: null,
  };
}

export function toConnectionOptions(config: RedisConfig): ConnectionOptions {
  return {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    maxRetriesPerRequest: config.maxRetriesPerRequest ?? null,
  };
}
