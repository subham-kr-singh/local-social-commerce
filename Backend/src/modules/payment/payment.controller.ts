import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { isRazorpayWebhookConfigured } from "../../config/razorpay.config.js";
import {
  createRazorpayCheckoutForOrder,
  markOrderPaidFromRazorpay,
  parsePaymentCapturedPayload,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
} from "./payment.service.js";

export const createRazorpayOrderController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { orderId } = req.body as { orderId: string };
  const checkout = await createRazorpayCheckoutForOrder(userId, orderId);
  res.status(200).json(new ApiResponse(200, "Razorpay order created", { checkout }));
});

export const verifyRazorpayPaymentController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  if (
    !verifyRazorpayPaymentSignature(
      body.razorpay_order_id,
      body.razorpay_payment_id,
      body.razorpay_signature,
    )
  ) {
    throw new ApiError(400, "Invalid payment signature");
  }

  const order = await markOrderPaidFromRazorpay({
    razorpayOrderId: body.razorpay_order_id,
    razorpayPaymentId: body.razorpay_payment_id,
    expectedUserId: userId,
  });
  if (!order.ok && order.reason === "order_not_found") {
    throw new ApiError(404, "Order not found for this Razorpay order");
  }
  if (!order.ok && order.reason === "forbidden") {
    throw new ApiError(403, "This payment does not belong to your account");
  }
  if (!order.ok) {
    throw new ApiError(400, "Payment cannot be applied to this order");
  }

  res.status(200).json(new ApiResponse(200, "Payment verified", { paid: true }));
});

export const razorpayWebhookController = asyncHandler(async (req: Request, res: Response) => {
  if (!isRazorpayWebhookConfigured()) {
    res.status(503).json({ message: "Webhook secret not configured" });
    return;
  }

  const sig = req.headers["x-razorpay-signature"];
  if (typeof sig !== "string") {
    throw new ApiError(400, "Missing X-Razorpay-Signature header");
  }

  const raw = req.rawBody;
  if (!raw) {
    throw new ApiError(400, "Missing raw body for webhook verification");
  }

  if (!verifyRazorpayWebhookSignature(raw, sig)) {
    throw new ApiError(400, "Invalid webhook signature");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }

  const payment = parsePaymentCapturedPayload(parsed);
  if (!payment) {
    res.status(200).json({ ok: true, ignored: true });
    return;
  }

  const result = await markOrderPaidFromRazorpay(payment);
  if (!result.ok && result.reason === "order_not_found") {
    console.warn("[razorpay webhook] No internal order for Razorpay order", payment.razorpayOrderId);
  }

  res.status(200).json({ ok: true });
});
