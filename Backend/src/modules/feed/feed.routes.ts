import { Router } from "express";
import { requireUser } from "../auth/auth.middleware.js";
import { validateQuery } from "../../shared/middleware/validate.middleware.js";
import { feedQuerySchema, nearbySellersQuerySchema } from "./feed.types.js";
import {
  getFeedController,
  getNearbySellersController,
} from "./feed.controller.js";

const router = Router();

router.get("/", requireUser, validateQuery(feedQuerySchema), getFeedController);
router.get(
  "/sellers",
  requireUser,
  validateQuery(nearbySellersQuerySchema),
  getNearbySellersController,
);

export default router;
