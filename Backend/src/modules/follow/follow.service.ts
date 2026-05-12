import { prisma } from "../../db/prisma.client.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { isPrismaUniqueViolation } from "../../shared/utils/prismaErrors.js";
import { redisDel, redisGet, redisSetEx } from "../../shared/utils/redisCache.js";
import { redisKeys } from "../../shared/utils/redisKeys.js";
import {
  REDIS_TTL_FOLLOWER_COUNT_SEC,
} from "../../config/constants.js";
import type { SafeUser } from "../auth/auth.types.js";

const safeUserSelect = {
  id: true,
  email: true,
  username: true,
  fullName: true,
  avatar: true,
  phone: true,
  city: true,
  latitude: true,
  longitude: true,
  isVerified: true,
  createdAt: true,
} as const;

export async function followSeller(userId: string, sellerId: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { id: true },
  });
  if (!seller) throw new ApiError(404, "Seller not found");

  try {
    const follow = await prisma.follow.create({
      data: { userId, sellerId },
    });

    await prisma.notification.create({
      data: {
        recipientId: sellerId,
        recipientType: "SELLER",
        type: "NEW_FOLLOWER",
        title: "New follower",
        body: "Someone started following your shop.",
        data: { userId },
      },
    });

    await redisDel(redisKeys.sellerFollowerCount(sellerId));

    return { follow, isNew: true as const };
  } catch (err) {
    if (isPrismaUniqueViolation(err)) {
      const existing = await prisma.follow.findUnique({
        where: {
          userId_sellerId: { userId, sellerId },
        },
      });
      if (!existing) throw err;
      return { follow: existing, isNew: false as const };
    }
    throw err;
  }
}

export async function unfollowSeller(userId: string, sellerId: string) {
  await prisma.follow.deleteMany({
    where: { userId, sellerId },
  });
  await redisDel(redisKeys.sellerFollowerCount(sellerId));
}

export async function getSellerFollowersPaginated(
  sellerId: string,
  page: number,
  limit: number,
) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    select: { id: true },
  });
  if (!seller) throw new ApiError(404, "Seller not found");

  const countKey = redisKeys.sellerFollowerCount(sellerId);
  let total: number | undefined;
  const cached = await redisGet(countKey);
  if (cached !== null) {
    total = Number(cached);
  } else {
    total = await prisma.follow.count({ where: { sellerId } });
    await redisSetEx(countKey, REDIS_TTL_FOLLOWER_COUNT_SEC, String(total));
  }

  const skip = (page - 1) * limit;
  const rows = await prisma.follow.findMany({
    where: { sellerId },
    skip,
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: safeUserSelect },
    },
  });

  const followers = rows.map((r: { user: SafeUser }) => r.user) as unknown as SafeUser[];

  return { total: total!, followers };
}
