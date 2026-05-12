import { z } from "zod";

export const likeTargetSchema = z.object({
  targetId: z.string().cuid(),
  targetType: z.enum(["POST", "STREAM"]),
});
