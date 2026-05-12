import { Router } from "express";
import { requireAuth, requireSeller } from "../auth/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import {
  agoraTokenSchema,
  createStreamSchema,
  pinProductSchema,
} from "./livestream.types.js";
import {
  createStreamController,
  endStreamController,
  generateAgoraTokenController,
  getStreamByIdController,
  getStreamsController,
  pinProductController,
  startStreamController,
  unpinProductController,
} from "./livestream.controller.js";

const router = Router();

router.post("/", requireSeller, validate(createStreamSchema), createStreamController);
router.get("/", getStreamsController);
router.get("/:id", getStreamByIdController);

router.post("/:id/start", requireSeller, startStreamController);
router.post("/:id/end", requireSeller, endStreamController);

router.post(
  "/:id/agora-token",
  requireAuth,
  validate(agoraTokenSchema),
  generateAgoraTokenController,
);

router.post(
  "/:id/products",
  requireSeller,
  validate(pinProductSchema),
  pinProductController,
);

router.delete("/:id/products/:productId", requireSeller, unpinProductController);
export default router;
