import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError.js";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      next(
        new ApiError(
          400,
          "Validation failed",
          result.error.flatten().fieldErrors as unknown[],
        ),
      );
      return;
    }
    req.body = result.data; // replace with parsed (coerced + trimmed) data
    next();
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      next(
        new ApiError(
          400,
          "Validation failed",
          result.error.flatten().fieldErrors as unknown[],
        ),
      );
      return;
    }
    req.validatedQuery = result.data as Record<string, unknown>;
    next();
  };
