import { z } from "zod";

export const productIdParamSchema = z.object({
  id: z.string().cuid(),
});

const tagsFromBody = z.preprocess((val) => {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) return val;
  if (typeof val === "string") {
    const s = val.trim();
    if (!s) return undefined;
    // allow JSON array string or comma-separated
    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const parsed = JSON.parse(s);
        return parsed;
      } catch {
        // fall through
      }
    }
    return s.split(",").map((t) => t.trim()).filter(Boolean);
  }
  return val;
}, z.array(z.string()).optional());

const normalizeTags = (tags?: string[]) =>
  (tags ?? [])
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

export const createProductSchema = z
  .object({
    title: z.string().min(3).max(120).trim(),
    description: z.string().min(10).max(2000).trim(),
    price: z.coerce.number().positive(),
    discountPrice: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0),
    category: z.string().min(1).trim(),
    tags: tagsFromBody,
  })
  .transform((v) => ({
    ...v,
    tags: normalizeTags(v.tags),
  }))
  .refine(
    (v) => v.discountPrice === undefined || v.discountPrice < v.price,
    { message: "discountPrice must be less than price", path: ["discountPrice"] },
  );

export const updateProductSchema = z
  .object({
    title: z.string().min(3).max(120).trim().optional(),
    description: z.string().min(10).max(2000).trim().optional(),
    price: z.coerce.number().positive().optional(),
    discountPrice: z.coerce.number().positive().optional(),
    stock: z.coerce.number().int().min(0).optional(),
    category: z.string().min(1).trim().optional(),
    tags: tagsFromBody,
    isActive: z.preprocess((v) => {
      if (typeof v === "string") return v === "true";
      return v;
    }, z.boolean().optional()),
  })
  .transform((v) => ({
    ...v,
    ...(v.tags !== undefined ? { tags: normalizeTags(v.tags) } : {}),
  }))
  .refine(
    (v) =>
      v.discountPrice === undefined ||
      v.price === undefined ||
      v.discountPrice < v.price,
    { message: "discountPrice must be less than price", path: ["discountPrice"] },
  )
  .refine(
    (v) =>
      v.title !== undefined ||
      v.description !== undefined ||
      v.price !== undefined ||
      v.discountPrice !== undefined ||
      v.stock !== undefined ||
      v.category !== undefined ||
      v.tags !== undefined ||
      v.isActive !== undefined,
    { message: "At least one field is required" },
  );

export const productQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(12),
  search: z.string().trim().min(1).optional(),
  category: z.string().trim().min(1).optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  inStock: z.preprocess((v) => {
    if (typeof v === "string") return v === "true";
    return v;
  }, z.boolean().optional()),
  sellerId: z.string().cuid().optional(),
  sortBy: z.enum(["newest", "oldest", "price_asc", "price_desc"]).optional(),
  city: z.string().trim().min(1).optional(),
});
