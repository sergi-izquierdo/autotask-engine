export interface SchedulerEnv {
  REDIS_URL: string;
  HEALTH_PORT: number;
  NODE_ENV: string;
  POLL_INTERVAL_MS: number;
}

export function loadEnv(): SchedulerEnv {
  return {
    REDIS_URL: process.env.REDIS_URL ?? "redis://localhost:6379",
    HEALTH_PORT: Number(process.env.HEALTH_PORT) || 4100,
    NODE_ENV: process.env.NODE_ENV ?? "development",
    POLL_INTERVAL_MS: Number(process.env.POLL_INTERVAL_MS) || 60_000,
  };
}
