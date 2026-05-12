import { Router } from "express";
import { likeNotImplemented } from "./like.controller.js";

const router = Router();
router.use(likeNotImplemented);
export default router;
