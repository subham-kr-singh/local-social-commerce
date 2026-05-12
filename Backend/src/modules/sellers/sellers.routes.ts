import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { validateQuery } from "../../shared/middleware/validate.middleware.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { sellerFollowersQuerySchema } from "../follow/follow.types.js";
import { getSellerFollowersController } from "../follow/follow.controller.js";

const router = Router();

const parseSellerId = (req: Request, _res: Response, next: NextFunction) => {
  const r = z.object({ id: z.string().cuid() }).safeParse({ id: req.params.id });
  if (!r.success) {
    return next(
      new ApiError(400, "Validation failed", r.error.flatten().fieldErrors as unknown[]),
    );
  }
  next();
};

router.get(
  "/:id/followers",
  validateQuery(sellerFollowersQuerySchema),
  parseSellerId,
  getSellerFollowersController,
);

export default router;
