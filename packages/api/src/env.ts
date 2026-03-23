export interface EnvConfig {
  PORT: number;
  HOST: string;
  NODE_ENV: string;
  CORS_ORIGIN: string;
}

export function loadEnv(): EnvConfig {
  return {
    PORT: Number(process.env.PORT) || 3000,
    HOST: process.env.HOST ?? "0.0.0.0",
    NODE_ENV: process.env.NODE_ENV ?? "development",
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? "*",
  };
}
