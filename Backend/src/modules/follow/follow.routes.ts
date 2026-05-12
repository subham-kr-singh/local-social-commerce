import { Router } from "express";
import { followNotImplemented } from "./follow.controller.js";

const router = Router();
router.use(followNotImplemented);
export default router;
