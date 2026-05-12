import { getRedis } from "../../db/redis.client.js";

export async function redisGet(key: string): Promise<string | null> {
  const r = getRedis();
  if (!r) return null;
  return r.get(key);
}

export async function redisSetEx(
  key: string,
  ttlSec: number,
  value: string,
): Promise<void> {
  const r = getRedis();
  if (!r) return;
  await r.set(key, value, "EX", ttlSec);
}

export async function redisDel(...keys: string[]): Promise<void> {
  const r = getRedis();
  if (!r || keys.length === 0) return;
  await r.del(...keys);
}
