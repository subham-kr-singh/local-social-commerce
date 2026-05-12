import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./auth.service.js";
import { ApiError } from "../../shared/utils/ApiError.js";

export const requireUser = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "No token provided"));
  }

  const token   = header.split(" ")[1] as string;
  const payload = verifyAccessToken(token); // throws ApiError on failure

  if (payload.role !== "user") {
    return next(new ApiError(403, "Access denied — user token required"));
  }

  req.user = payload;
  next();
};

export const requireSeller = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "No token provided"));
  }

  const token   = header.split(" ")[1] as string;
  const payload = verifyAccessToken(token);

  if (payload.role !== "seller") {
    return next(new ApiError(403, "Access denied — seller token required"));
  }

  req.user = payload;
  next();
};

// Accepts either buyer or seller JWT and attaches req.user.
export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "No token provided"));
  }

  const token = header.split(" ")[1] as string;
  const payload = verifyAccessToken(token);
  req.user = payload;
  next();
};
