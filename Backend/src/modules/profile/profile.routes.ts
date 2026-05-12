import { Router } from "express";
import { profileNotImplemented } from "./profile.controller.js";

const router = Router();
router.use(profileNotImplemented);
export default router;
