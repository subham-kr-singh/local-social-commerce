import { z } from "zod";

export const livestreamIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const createStreamSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional(),
  thumbnail: z.string().url().optional(),
  scheduledAt: z.coerce.date().optional(),
});

export const streamsQuerySchema = z.object({
  status: z.enum(["SCHEDULED", "LIVE", "ENDED"]).optional(),
  city: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
});

export const agoraTokenSchema = z.object({
  role: z.enum(["host", "audience"]),
});

export const pinProductSchema = z.object({
  productId: z.string().cuid(),
  isPinned: z.preprocess((v) => {
    if (typeof v === "string") return v === "true";
    return v;
  }, z.boolean().optional().default(true)),
  displayOrder: z.coerce.number().int().min(0).optional().default(0),
});
