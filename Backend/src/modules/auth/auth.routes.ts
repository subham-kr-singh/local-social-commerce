import { Router } from "express";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { requireUser, requireSeller } from "./auth.middleware.js";
import {
  registerUserSchema,
  registerSellerSchema,
  loginSchema,
} from "./auth.types.js";
import {
  registerUserController,
  loginUserController,
  refreshUserTokenController,
  logoutUserController,
  getMeUserController,
  registerSellerController,
  loginSellerController,
  refreshSellerTokenController,
  logoutSellerController,
  getMeSellerController,
} from "./auth.controller.js";

const router = Router();

// ── User routes ───────────────────────────────
router.post(
  "/user/register",
  validate(registerUserSchema),
  registerUserController,
);
router.post("/user/login", validate(loginSchema), loginUserController);
router.post("/user/refresh", refreshUserTokenController);
router.post("/user/logout", logoutUserController);
router.get("/user/me", requireUser, getMeUserController);

// ── Seller routes ─────────────────────────────
router.post(
  "/seller/register",
  validate(registerSellerSchema),
  registerSellerController,
);
router.post("/seller/login", validate(loginSchema), loginSellerController);
router.post("/seller/refresh", refreshSellerTokenController);
router.post("/seller/logout", logoutSellerController);
router.get("/seller/me", requireSeller, getMeSellerController);

export default router;
