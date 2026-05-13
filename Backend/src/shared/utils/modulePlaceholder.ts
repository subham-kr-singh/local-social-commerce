import type { Request, RequestHandler, Response } from "express";
import { ApiResponse } from "./ApiResponse.js";

export function moduleNotImplemented(moduleName: string): RequestHandler {
  return (_req: Request, res: Response) => {
    res
      .status(501)
      .json(new ApiResponse(501, `${moduleName} module — not implemented`, null));
  };
}
