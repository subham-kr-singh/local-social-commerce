import { Router } from "express";
import { requireUser } from "../auth/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createRazorpayOrderController,
  razorpayWebhookController,
  verifyRazorpayPaymentController,
} from "./payment.controller.js";
import { createRazorpayOrderBodySchema, verifyRazorpayPaymentBodySchema } from "./payment.types.js";

const router = Router();

router.post(
  "/razorpay/order",
  requireUser,
  validate(createRazorpayOrderBodySchema),
  createRazorpayOrderController,
);

router.post(
  "/razorpay/verify",
  requireUser,
  validate(verifyRazorpayPaymentBodySchema),
  verifyRazorpayPaymentController,
);

router.post("/razorpay/webhook", razorpayWebhookController);

export default router;
