import { Router } from "express";
import { requireSeller } from "../auth/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { uploadMemoryMedia } from "../../shared/middleware/upload.middleware.js";
import {
  createPostController,
  deletePostController,
  getPostByIdController,
  getPostProductsController,
  getPublicPostsController,
  updatePostController,
} from "./post.controller.js";
import { createPostSchema, updatePostSchema } from "./post.types.js";

const router = Router();

router.post(
  "/",
  requireSeller,
  uploadMemoryMedia.array("media", 5),
  validate(createPostSchema),
  createPostController,
);

router.get("/", getPublicPostsController);
router.get("/:id", getPostByIdController);
router.get("/:id/products", getPostProductsController);

router.patch("/:id", requireSeller, validate(updatePostSchema), updatePostController);
router.delete("/:id", requireSeller, deletePostController);
export default router;
