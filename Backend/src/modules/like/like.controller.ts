import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { likeTarget, unlikeTarget, countLikes } from "./like.service.js";

export const likeController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const { targetId, targetType } = req.body as {
      targetId: string;
      targetType: "POST" | "STREAM";
    };

    const { like, isNew } = await likeTarget(userId, targetId, targetType);
    const status = isNew ? 201 : 200;
    res.status(status).json(new ApiResponse(status, isNew ? "Liked" : "Already liked", { like }));
  },
);

export const unlikeController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const { targetId, targetType } = req.body as {
      targetId: string;
      targetType: "POST" | "STREAM";
    };

    await unlikeTarget(userId, targetId, targetType);
    res.status(200).json(new ApiResponse(200, "Unliked", null));
  },
);

export const likeCountController = asyncHandler(
  async (req: Request, res: Response) => {
    const q = req.validatedQuery as {
      targetId: string;
      targetType: "POST" | "STREAM";
    };
    const count = await countLikes(q.targetId, q.targetType);
    res.status(200).json(new ApiResponse(200, "Like count", { count }));
  },
);
