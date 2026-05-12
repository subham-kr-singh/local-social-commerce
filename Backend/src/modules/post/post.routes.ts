import { Router } from "express";
import { postNotImplemented } from "./post.controller.js";

const router = Router();
router.use(postNotImplemented);
export default router;
