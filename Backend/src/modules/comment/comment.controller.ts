import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import {
  createComment,
  listCommentsPaginated,
  deleteOwnComment,
} from "./comment.service.js";

export const createCommentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const body = req.body as {
      targetId: string;
      targetType: "POST" | "STREAM";
      text: string;
      parentId?: string | undefined;
    };

    const comment = await createComment(userId, body);
    res
      .status(201)
      .json(new ApiResponse(201, "Comment created", { comment }));
  },
);

export const listCommentsController = asyncHandler(
  async (req: Request, res: Response) => {
    const q = req.validatedQuery as {
      targetId: string;
      targetType: "POST" | "STREAM";
      page: number;
      limit: number;
    };

    const data = await listCommentsPaginated(
      q.targetId,
      q.targetType,
      q.page,
      q.limit,
    );
    res.status(200).json(new ApiResponse(200, "Comments", data));
  },
);

export const deleteCommentController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const id = req.params.id as string;

    await deleteOwnComment(userId, id);
    res.status(200).json(new ApiResponse(200, "Comment deleted", null));
  },
);
