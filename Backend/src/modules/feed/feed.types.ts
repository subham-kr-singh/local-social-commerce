import { z } from "zod";

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const nearbySellersQuerySchema = z.object({
  radius: z.coerce
    .number()
    .int()
    .positive()
    .max(500_000)
    .optional()
    .default(10_000),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});
