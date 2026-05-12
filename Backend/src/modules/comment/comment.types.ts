import { z } from "zod";

export const commentIdParamSchema = z.object({
  id: z.string().cuid(),
});
