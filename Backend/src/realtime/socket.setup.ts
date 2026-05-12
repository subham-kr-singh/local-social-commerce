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
  io.adapter(createAdapter(pubClient, subClient));
}
