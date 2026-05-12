import { z } from "zod";

export const orderIdParamSchema = z.object({
  id: z.string().cuid(),
});

export const createOrderSchema = z
  .object({
    sellerId: z.string().cuid(),
    source: z.enum(["LIVE_STREAM", "POST", "DIRECT"]),
    liveStreamId: z.string().cuid().optional(),
    postId: z.string().cuid().optional(),
    items: z
      .array(
        z.object({
          productId: z.string().cuid(),
          quantity: z.coerce.number().int().positive().max(50),
        }),
      )
      .min(1)
      .max(50),
    deliveryAddress: z.object({
      name: z.string().min(2).max(100).trim(),
      phone: z.string().min(7).max(20).trim(),
      street: z.string().min(3).max(200).trim(),
      city: z.string().min(2).max(100).trim(),
      state: z.string().min(2).max(100).trim(),
      pincode: z.string().min(4).max(12).trim(),
    }),
  })
  .refine((v) => (v.source === "LIVE_STREAM" ? !!v.liveStreamId : true), {
    message: "liveStreamId is required when source=LIVE_STREAM",
    path: ["liveStreamId"],
  })
  .refine((v) => (v.source === "POST" ? !!v.postId : true), {
    message: "postId is required when source=POST",
    path: ["postId"],
  });

export const ordersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(50).optional().default(10),
  status: z
    .enum([
      "PENDING",
      "CONFIRMED",
      "PROCESSING",
      "SHIPPED",
      "DELIVERED",
      "CANCELLED",
      "REFUNDED",
    ])
    .optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"]),
});
