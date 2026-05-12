import { prisma } from "../../db/prisma.client.js";
import { ApiError } from "../../shared/utils/ApiError.js";

const commentUserPublic = {
  id: true,
  username: true,
  avatar: true,
} as const;

export async function createComment(
  userId: string,
  input: {
    targetId: string;
    targetType: "POST" | "STREAM";
    text: string;
    parentId?: string | undefined;
  },
) {
  const { targetId, targetType, text, parentId } = input;

  if (targetType === "POST") {
    const post = await prisma.post.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!post) throw new ApiError(404, "Post not found");
  } else {
    const stream = await prisma.liveStream.findUnique({
      where: { id: targetId },
      select: { id: true },
    });
    if (!stream) throw new ApiError(404, "Live stream not found");
  }

  if (parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: parentId },
      select: { id: true, targetId: true, targetType: true },
    });
    if (!parent) throw new ApiError(404, "Parent comment not found");
    if (parent.targetId !== targetId || parent.targetType !== targetType) {
      throw new ApiError(400, "Parent comment does not belong to this target");
    }
  }

  return prisma.comment.create({
    data: {
      userId,
      targetId,
      targetType,
      text,
      parentId: parentId ?? null,
    },
    include: {
      user: { select: commentUserPublic },
    },
  });
}

export async function listCommentsPaginated(
  targetId: string,
  targetType: "POST" | "STREAM",
  page: number,
  limit: number,
) {
  const whereRoot = {
    targetId,
    targetType,
    parentId: null,
  };

  const total = await prisma.comment.count({ where: whereRoot });
  const skip = (page - 1) * limit;

  const comments = await prisma.comment.findMany({
    where: whereRoot,
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: commentUserPublic },
      replies: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: commentUserPublic },
        },
      },
    },
  });

  return { comments, total, page };
}

export async function deleteOwnComment(userId: string, commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true },
  });
  if (!comment) throw new ApiError(404, "Comment not found");
  if (comment.userId !== userId) {
    throw new ApiError(403, "You can only delete your own comments");
  }

  await prisma.comment.delete({ where: { id: commentId } });
}
