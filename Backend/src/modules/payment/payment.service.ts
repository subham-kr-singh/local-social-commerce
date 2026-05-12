import crypto from "node:crypto";
import Razorpay from "razorpay";
import { env } from "../../config/env.js";
import { isRazorpayConfigured } from "../../config/razorpay.config.js";
import { prisma } from "../../db/prisma.client.js";
import { ApiError } from "../../shared/utils/ApiError.js";

function getRazorpayClient(): Razorpay {
  if (!isRazorpayConfigured()) {
    throw new ApiError(503, "Razorpay is not configured");
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID!,
    key_secret: env.RAZORPAY_KEY_SECRET!,
  });
}

export async function createRazorpayCheckoutForOrder(userId: string, orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.userId !== userId) throw new ApiError(403, "Access denied");
  if (order.status !== "PENDING") throw new ApiError(400, "Order is not payable");

  const amountPaise = Math.round(order.total * 100);
  if (amountPaise < 100) {
    throw new ApiError(400, "Order total must be at least ₹1 for Razorpay checkout");
  }

  const rzp = getRazorpayClient();
  const receipt = orderId.replace(/-/g, "").slice(0, 40);
  const rzpOrder = await rzp.orders.create({
    amount: amountPaise,
    currency: "INR",
    receipt: receipt.length ? receipt : orderId.slice(0, 40),
    notes: { internalOrderId: orderId },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { razorpayOrderId: rzpOrder.id },
  });

  return {
    keyId: env.RAZORPAY_KEY_ID!,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    razorpayOrderId: rzpOrder.id,
    internalOrderId: orderId,
  };
}

export function verifyRazorpayPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) return false;
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(payload)
    .digest("hex");
  return expected === razorpaySignature;
}

export function verifyRazorpayWebhookSignature(rawBody: string, signatureHeader: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  return expected === signatureHeader;
}

export async function markOrderPaidFromRazorpay(params: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  /** When set (browser verify), only this user may mark the order paid */
  expectedUserId?: string;
}): Promise<{ ok: boolean; reason?: string }> {
  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: params.razorpayOrderId },
  });
  if (!order) return { ok: false, reason: "order_not_found" };
  if (params.expectedUserId && order.userId !== params.expectedUserId) {
    return { ok: false, reason: "forbidden" };
  }
  if (order.status === "CONFIRMED" && order.razorpayPaymentId === params.razorpayPaymentId) {
    return { ok: true };
  }
  if (order.status !== "PENDING") return { ok: false, reason: "invalid_status" };

  await prisma.order.update({
    where: { id: order.id },
    data: {
      status: "CONFIRMED",
      razorpayPaymentId: params.razorpayPaymentId,
    },
  });
  return { ok: true };
}

export function parsePaymentCapturedPayload(
  body: unknown,
): { razorpayOrderId: string; razorpayPaymentId: string } | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  if (root.event !== "payment.captured") return null;
  const payload = root.payload;
  if (!payload || typeof payload !== "object") return null;
  const payment = (payload as Record<string, unknown>).payment;
  if (!payment || typeof payment !== "object") return null;
  const entity = (payment as Record<string, unknown>).entity;
  if (!entity || typeof entity !== "object") return null;
  const orderId = (entity as Record<string, unknown>).order_id;
  const paymentId = (entity as Record<string, unknown>).id;
  if (typeof orderId === "string" && typeof paymentId === "string") {
    return { razorpayOrderId: orderId, razorpayPaymentId: paymentId };
  }
  return null;
}
