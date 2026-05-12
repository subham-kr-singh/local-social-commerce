import { Router } from "express";
import { requireAuth, requireSeller, requireUser } from "../auth/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  createOrderController,
  getOrderByIdController,
  getSellerOrdersController,
  getUserOrdersController,
  updateOrderStatusController,
} from "./order.controller.js";
import { createOrderSchema, updateStatusSchema } from "./order.types.js";

const router = Router();

router.post("/", requireUser, validate(createOrderSchema), createOrderController);
router.get("/", requireUser, getUserOrdersController);
router.get("/seller", requireSeller, getSellerOrdersController);
router.get("/:id", requireAuth, getOrderByIdController);
router.patch(
  "/:id/status",
  requireSeller,
  validate(updateStatusSchema),
  updateOrderStatusController,
);
export default router;
