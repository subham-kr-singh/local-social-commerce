import type { JwtAuthPayload } from "../../modules/auth/auth.types.js";

declare global {
  namespace Express {
    interface Request {
      user?: JwtAuthPayload;
      /** Set by `validateQuery` middleware */
      validatedQuery?: Record<string, unknown>;
    }
  }
}
