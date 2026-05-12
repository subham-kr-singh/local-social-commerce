import { Redis } from "ioredis";
import { env } from "../config/env.js";

const globalForRedis = globalThis as unknown as { redis: Redis | undefined };

export function getRedis(): Redis | undefined {
  const url = env.REDIS_URL?.trim();
  if (!url) return undefined;

  if (!globalForRedis.redis) {
    globalForRedis.redis = new Redis(url, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }

  return globalForRedis.redis;
}
