import { Router } from "express";
import { orderNotImplemented } from "./order.controller.js";

const router = Router();
router.use(orderNotImplemented);
export default router;
