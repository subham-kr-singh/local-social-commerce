import { prisma } from "../../db/prisma.client.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { isPrismaUniqueViolation } from "../../shared/utils/prismaErrors.js";

export async function likeTarget(
  userId: string,
  targetId: string,
  targetType: "POST" | "STREAM",
) {
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

  try {
    const like = await prisma.like.create({
      data: { userId, targetId, targetType },
    });
    return { like, isNew: true as const };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      const existing = await prisma.like.findFirst({
        where: { userId, targetId, targetType },
      });
      if (!existing) throw err;
      return { like: existing, isNew: false as const };
    }
    throw err;
  }
}

export async function unlikeTarget(
  userId: string,
  targetId: string,
  targetType: "POST" | "STREAM",
) {
  await prisma.like.deleteMany({
    where: { userId, targetId, targetType },
  });
}

export async function countLikes(targetId: string, targetType: "POST" | "STREAM") {
  const count = await prisma.like.count({
    where: { targetId, targetType },
  });
  return count;
}
