import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import {
  followSeller,
  unfollowSeller,
  getSellerFollowersPaginated,
} from "./follow.service.js";

export const followSellerController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const sellerId = req.params.sellerId as string;

    const { follow, isNew } = await followSeller(userId, sellerId);
    const status = isNew ? 201 : 200;
    const message = isNew ? "Now following seller" : "Already following";
    res.status(status).json(new ApiResponse(status, message, { follow }));
  },
);

export const unfollowSellerController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const sellerId = req.params.sellerId as string;

    await unfollowSeller(userId, sellerId);
    res.status(200).json(new ApiResponse(200, "Unfollowed", null));
  },
);

export const getSellerFollowersController = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.params.id as string;
    const q = req.validatedQuery as {
      page: number;
      limit: number;
    };

    const data = await getSellerFollowersPaginated(
      sellerId,
      q.page,
      q.limit,
    );
    res
      .status(200)
      .json(new ApiResponse(200, "Followers", data));
  },
);
