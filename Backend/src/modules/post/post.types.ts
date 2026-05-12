import { z } from "zod";

export const postIdParamSchema = z.object({
  id: z.string().cuid(),
});
