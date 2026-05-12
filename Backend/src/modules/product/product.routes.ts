import { Router } from "express";
import { productNotImplemented } from "./product.controller.js";

const router = Router();
router.use(productNotImplemented);
export default router;
