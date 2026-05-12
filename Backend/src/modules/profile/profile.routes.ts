import { Router } from "express";
import { requireUser, requireSeller } from "../auth/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { uploadMemory } from "../../shared/middleware/upload.middleware.js";
import {
  updateUserProfileSchema,
  updateSellerProfileSchema,
} from "./profile.types.js";
import {
  getUserProfileController,
  patchUserProfileController,
  getSellerProfileController,
  patchSellerProfileController,
} from "./profile.controller.js";

const router = Router();

const uploadUserAvatar = uploadMemory.single("avatar");
const uploadSellerImages = uploadMemory.fields([
  { name: "logo", maxCount: 1 },
  { name: "coverImage", maxCount: 1 },
]);

router.get("/user", requireUser, getUserProfileController);
router.patch(
  "/user",
  requireUser,
  uploadUserAvatar,
  validate(updateUserProfileSchema),
  patchUserProfileController,
);

router.get("/seller", requireSeller, getSellerProfileController);
router.patch(
  "/seller",
  requireSeller,
  uploadSellerImages,
  validate(updateSellerProfileSchema),
  patchSellerProfileController,
);

export default router;
