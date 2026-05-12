import { Router } from "express";
import { feedNotImplemented } from "./feed.controller.js";

const router = Router();
router.use(feedNotImplemented);
export default router;
