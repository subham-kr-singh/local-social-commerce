import { z } from "zod";

export const likeBodySchema = z.object({
  targetId: z.string().cuid(),
  targetType: z.enum(["POST", "STREAM"]),
});

export const unlikeBodySchema = likeBodySchema;

export const likeCountQuerySchema = z.object({
  targetId: z.string().cuid(),
  targetType: z.enum(["POST", "STREAM"]),
});
