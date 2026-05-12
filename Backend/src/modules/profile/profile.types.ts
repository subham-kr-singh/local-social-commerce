import { z } from "zod";

export const updateProfileBodySchema = z
  .object({
    fullName: z.string().min(1).optional(),
    bio: z.string().max(500).optional(),
  })
  .strict();
