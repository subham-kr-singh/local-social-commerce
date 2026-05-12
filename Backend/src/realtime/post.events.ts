import { getRedis } from "../db/redis.client.js";
import { getIo } from "./io.js";

export type NewPostEventPayload = {
  postId: string;
  sellerId: string;
  city?: string | null;
  followerUserIds?: string[];
};

export async function emitNewPost(payload: NewPostEventPayload): Promise<void> {
  const io = getIo();
  if (io && payload.followerUserIds?.length) {
    for (const userId of payload.followerUserIds) {
      io.to(`user:${userId}`).emit("new-post", payload);
    }
  } else if (io) {
    // Fallback broadcast (single-node dev) if follower targeting isn't available.
    io.emit("new-post", payload);
  }

  const redis = getRedis();
  if (redis) {
    // Publish so other nodes (and future workers) can relay.
    await redis.publish("events:new-post", JSON.stringify(payload));
  }
}

