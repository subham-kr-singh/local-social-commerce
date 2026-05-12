import { Router } from "express";
import { livestreamNotImplemented } from "./livestream.controller.js";

const router = Router();
router.use(livestreamNotImplemented);
export default router;
