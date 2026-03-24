import { describe, it, expect, afterEach } from "vitest";
import { getRedisConfig, toConnectionOptions } from "../redis-config.js";

describe("getRedisConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns defaults when no env vars are set", () => {
    delete process.env["REDIS_HOST"];
    delete process.env["REDIS_PORT"];
    delete process.env["REDIS_PASSWORD"];
    delete process.env["REDIS_DB"];

    const config = getRedisConfig();

    expect(config.host).toBe("localhost");
    expect(config.port).toBe(6379);
    expect(config.password).toBeUndefined();
    expect(config.db).toBe(0);
    expect(config.maxRetriesPerRequest).toBeNull();
  });

  it("reads values from environment variables", () => {
    process.env["REDIS_HOST"] = "redis.example.com";
    process.env["REDIS_PORT"] = "6380";
    process.env["REDIS_PASSWORD"] = "secret";
    process.env["REDIS_DB"] = "2";

    const config = getRedisConfig();

    expect(config.host).toBe("redis.example.com");
    expect(config.port).toBe(6380);
    expect(config.password).toBe("secret");
    expect(config.db).toBe(2);
  });
});

describe("toConnectionOptions", () => {
  it("converts RedisConfig to ConnectionOptions", () => {
    const config = {
      host: "myhost",
      port: 6380,
      password: "pass",
      db: 1,
      maxRetriesPerRequest: null,
    };

    const opts = toConnectionOptions(config);

    expect(opts).toEqual({
      host: "myhost",
      port: 6380,
      password: "pass",
      db: 1,
      maxRetriesPerRequest: null,
    });
  });
});
