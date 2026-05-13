import type { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { env } from "../config/env.js";

export function attachSocketIoRedisAdapter(io: Server): void {
  const url = env.REDIS_URL?.trim();
  if (!url) {
    console.warn(
      "⚠️  REDIS_URL not set — Socket.IO Redis adapter skipped (single-node mode)",
    );
    return;
  }

  const pubClient = new Redis(url, { maxRetriesPerRequest: null });
  const subClient = pubClient.duplicate();

  for (const c of [pubClient, subClient]) {
    c.on("error", (err: Error) => {
      console.error("[redis-adapter] Redis client error (check REDIS_URL on Railway):", err.message);
    });
  }

  io.adapter(createAdapter(pubClient, subClient));
}
