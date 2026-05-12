import { Router } from "express";
import type { Request, Response, NextFunction } from "express";
import { requireUser } from "../auth/auth.middleware.js";
import { validate, validateQuery } from "../../shared/middleware/validate.middleware.js";
import {
  createCommentSchema,
  listCommentsQuerySchema,
} from "./comment.types.js";
import {
  createCommentController,
  listCommentsController,
  deleteCommentController,
} from "./comment.controller.js";
import { z } from "zod";
import { ApiError } from "../../shared/utils/ApiError.js";

const router = Router();

const parseCommentId = (req: Request, _res: Response, next: NextFunction) => {
  const r = z.object({ id: z.string().cuid() }).safeParse({ id: req.params.id });
  if (!r.success) {
    return next(
      new ApiError(400, "Validation failed", r.error.flatten().fieldErrors as unknown[]),
    );
  }
  next();
};

router.post(
  "/",
  requireUser,
  validate(createCommentSchema),
  createCommentController,
);
router.get(
  "/",
  validateQuery(listCommentsQuerySchema),
  listCommentsController,
);
router.delete(
  "/:id",
  requireUser,
  parseCommentId,
  deleteCommentController,
);

export default router;
