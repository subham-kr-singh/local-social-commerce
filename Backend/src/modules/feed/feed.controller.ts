import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { getPersonalisedFeed, getNearbySellers } from "./feed.service.js";

export const getFeedController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const q = req.validatedQuery as { page: number; limit: number };

    const data = await getPersonalisedFeed(userId, q.page, q.limit);
    res.status(200).json(new ApiResponse(200, "Feed", data));
  },
);

export const getNearbySellersController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const q = req.validatedQuery as {
      radius: number;
      page: number;
      limit: number;
    };

    const data = await getNearbySellers(
      userId,
      q.radius,
      q.page,
      q.limit,
    );
    res.status(200).json(new ApiResponse(200, "Nearby sellers", data));
  },
);
