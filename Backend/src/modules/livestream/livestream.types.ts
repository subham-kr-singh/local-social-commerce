import { z } from "zod";

export const livestreamIdParamSchema = z.object({
  id: z.string().cuid(),
});
