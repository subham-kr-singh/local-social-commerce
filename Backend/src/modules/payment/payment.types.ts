import { z } from "zod";

export const createRazorpayOrderBodySchema = z.object({
  orderId: z.string().cuid(),
});

export const verifyRazorpayPaymentBodySchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});
