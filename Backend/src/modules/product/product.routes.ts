import { Router } from "express";
import { requireSeller } from "../auth/auth.middleware.js";
import { validate } from "../../shared/middleware/validate.middleware.js";
import { uploadMemoryImages } from "../../shared/middleware/upload.middleware.js";
import {
  createProductController,
  deleteProductController,
  getMyProductsController,
  getProductByIdController,
  getPublicProductsController,
  updateProductController,
} from "./product.controller.js";
import { createProductSchema, updateProductSchema } from "./product.types.js";

const router = Router();

router.post(
  "/",
  requireSeller,
  uploadMemoryImages.array("images", 5),
  validate(createProductSchema),
  createProductController,
);

router.get("/", getPublicProductsController);
router.get("/seller/my-products", requireSeller, getMyProductsController);
router.get("/:id", getProductByIdController);

router.patch(
  "/:id",
  requireSeller,
  uploadMemoryImages.array("images", 5),
  validate(updateProductSchema),
  updateProductController,
);

router.delete("/:id", requireSeller, deleteProductController);
export default router;
