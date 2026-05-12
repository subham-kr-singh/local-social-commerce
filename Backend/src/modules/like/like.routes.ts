import { Router } from "express";
import { requireUser } from "../auth/auth.middleware.js";
import { validate, validateQuery } from "../../shared/middleware/validate.middleware.js";
import {
  likeBodySchema,
  unlikeBodySchema,
  likeCountQuerySchema,
} from "./like.types.js";
import {
  likeController,
  unlikeController,
  likeCountController,
} from "./like.controller.js";

const router = Router();

router.post("/", requireUser, validate(likeBodySchema), likeController);
router.delete("/", requireUser, validate(unlikeBodySchema), unlikeController);
router.get(
  "/count",
  validateQuery(likeCountQuerySchema),
  likeCountController,
);

export default router;
