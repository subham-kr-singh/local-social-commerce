import { z } from "zod";

export const createCommentSchema = z.object({
  targetId: z.string().cuid(),
  targetType: z.enum(["POST", "STREAM"]),
  text: z.string().min(1).max(500),
  parentId: z.string().cuid().optional(),
});

export const listCommentsQuerySchema = z.object({
  targetId: z.string().cuid(),
  targetType: z.enum(["POST", "STREAM"]),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const commentIdParamSchema = z.object({
  id: z.string().cuid(),
});
