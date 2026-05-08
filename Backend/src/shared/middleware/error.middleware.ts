import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError.js";
import { env } from "../../config/env.js";

export const errorMiddleware = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Known operational error
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  // Zod / validation shape (passed via next(error) from validate middleware)
  if (err && typeof err === "object" && "flatten" in (err as object)) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: (err as { flatten: () => unknown }).flatten(),
    });
    return;
  }

  // Unknown / programming error
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === "production" ? "Internal server error" : String(err),
    errors: [],
  });
};
