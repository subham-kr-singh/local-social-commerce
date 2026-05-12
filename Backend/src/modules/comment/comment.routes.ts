import { Router } from "express";
import { commentNotImplemented } from "./comment.controller.js";

const router = Router();
router.use(commentNotImplemented);
export default router;
