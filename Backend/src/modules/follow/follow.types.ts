import { z } from "zod";

export const sellerIdParamSchema = z.object({
  sellerId: z.string().cuid(),
});

export const sellerFollowersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
