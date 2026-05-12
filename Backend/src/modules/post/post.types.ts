import { z } from "zod";

export const postIdParamSchema = z.object({
  id: z.string().cuid(),
});

const productIdsFromBody = z.preprocess((val) => {
  // multipart/form-data often sends arrays as JSON strings or repeated fields
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return parsed;
    } catch {
      // fall through
      return [trimmed];
    }
  }
  return val;
}, z.array(z.string().cuid()).max(10).optional());

export const createPostSchema = z.object({
  caption: z.string().min(1).max(2000).trim(),
  mediaType: z.enum(["IMAGE", "VIDEO"]),
  productIds: productIdsFromBody,
});

export const updatePostSchema = z
  .object({
    caption: z.string().min(1).max(2000).trim().optional(),
    productIds: productIdsFromBody,
  })
  .refine((v) => v.caption !== undefined || v.productIds !== undefined, {
    message: "At least one of caption or productIds is required",
  });

export const publicPostsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(50).optional(),
  sellerId: z.string().cuid().optional(),
  city: z.string().trim().min(1).optional(),
});
