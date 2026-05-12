import { z } from "zod";

function stripEmptyFormFields(raw: unknown): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v === "" || v === undefined) continue;
    o[k] = v;
  }
  return o;
}

export const updateUserProfileSchema = z.preprocess(
  stripEmptyFormFields,
  z.object({
    fullName: z.string().min(1).max(120).optional(),
    bio: z.string().max(500).optional(),
    phone: z.string().regex(/^\d{10}$/).optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(120).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  }),
);

export const updateSellerProfileSchema = z.preprocess(
  stripEmptyFormFields,
  z.object({
    businessName: z.string().min(1).max(200).optional(),
    ownerName: z.string().min(1).max(200).optional(),
    bio: z.string().max(2000).optional(),
    phone: z.string().regex(/^\d{10}$/).optional(),
    city: z.string().max(120).optional(),
    state: z.string().max(120).optional(),
    address: z.string().max(500).optional(),
    latitude: z.coerce.number().optional(),
    longitude: z.coerce.number().optional(),
  }),
);
