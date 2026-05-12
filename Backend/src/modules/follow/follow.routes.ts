import { Router } from "express";
import { requireUser } from "../auth/auth.middleware.js";
import { validateQuery } from "../../shared/middleware/validate.middleware.js";
import {
  followSellerController,
  unfollowSellerController,
} from "./follow.controller.js";
import { sellerIdParamSchema } from "./follow.types.js";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../shared/utils/ApiError.js";

const router = Router();

const parseSellerIdParam = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const r = sellerIdParamSchema.safeParse({
    sellerId: req.params.sellerId,
  });
  if (!r.success) {
    return next(
      new ApiError(400, "Validation failed", r.error.flatten().fieldErrors as unknown[]),
    );
  }
  next();
};

router.post(
  "/:sellerId",
  requireUser,
  parseSellerIdParam,
  followSellerController,
);
router.delete(
  "/:sellerId",
  requireUser,
  parseSellerIdParam,
  unfollowSellerController,
);

export default router;
