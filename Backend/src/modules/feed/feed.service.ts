import { prisma } from "../../db/prisma.client.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { redisGet, redisSetEx } from "../../shared/utils/redisCache.js";
import { redisKeys } from "../../shared/utils/redisKeys.js";
import { REDIS_TTL_FEED_PAGE_SEC } from "../../config/constants.js";
import type { Prisma } from "@prisma/client";

const feedPostInclude = {
  seller: {
    select: {
      id: true,
      businessName: true,
      logo: true,
    },
  },
  postProducts: {
    include: {
      product: {
        select: {
          id: true,
          title: true,
          price: true,
          discountPrice: true,
          images: true,
        },
      },
    },
  },
} satisfies Prisma.PostInclude;

type FeedPost = Prisma.PostGetPayload<{ include: typeof feedPostInclude }>;

export async function getPersonalisedFeed(
  userId: string,
  page: number,
  limit: number,
) {
  const cacheKey = redisKeys.feedPage(userId, page);
  const cached = await redisGet(cacheKey);
  if (cached) {
    return JSON.parse(cached) as {
      posts: FeedPost[];
      total: number;
      page: number;
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { latitude: true, longitude: true },
  });

  const follows = await prisma.follow.findMany({
    where: { userId },
    select: { sellerId: true },
  });
  const followedIds = [...new Set(follows.map((f: { sellerId: string }) => f.sellerId))];

  const candidateLimit = Math.max(limit * 5, 50);

  const postsFromFollowed: FeedPost[] =
    followedIds.length > 0
      ? await prisma.post.findMany({
          where: { sellerId: { in: followedIds } },
          orderBy: { createdAt: "desc" },
          take: candidateLimit,
          include: feedPostInclude,
        })
      : [];

  let postsFromNearby: FeedPost[] = [];
  if (
    user?.latitude != null &&
    user?.longitude != null &&
    Number.isFinite(user.latitude) &&
    Number.isFinite(user.longitude)
  ) {
    const nearbySellerRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT s.id
      FROM "Seller" s
      WHERE s."isActive" = true
        AND s.latitude IS NOT NULL
        AND s.longitude IS NOT NULL
        AND ST_DWithin(
          ST_MakePoint(s.longitude, s.latitude)::geography,
          ST_MakePoint(${user.longitude}, ${user.latitude})::geography,
          ${10_000}
        )
    `;
    const nearbyIds = [...new Set(nearbySellerRows.map((r: { id: string }) => r.id))];
    if (nearbyIds.length > 0) {
      postsFromNearby = await prisma.post.findMany({
        where: { sellerId: { in: nearbyIds } },
        orderBy: { createdAt: "desc" },
        take: candidateLimit,
        include: feedPostInclude,
      });
    }
  }

  const byId = new Map<string, FeedPost>();
  for (const p of postsFromFollowed) byId.set(p.id, p);
  for (const p of postsFromNearby) {
    if (!byId.has(p.id)) byId.set(p.id, p);
  }

  const merged = [...byId.values()].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const total = merged.length;
  const start = (page - 1) * limit;
  const posts = merged.slice(start, start + limit);

  const payload = { posts, total, page };
  await redisSetEx(
    cacheKey,
    REDIS_TTL_FEED_PAGE_SEC,
    JSON.stringify(payload),
  );
  return payload;
}

export type SellerWithDistance = {
  id: string;
  email: string;
  businessName: string;
  ownerName: string;
  logo: string | null;
  coverImage: string | null;
  bio: string | null;
  phone: string;
  category: string;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  isActive: boolean;
  rating: number;
  totalSales: number;
  createdAt: Date;
  distanceMetres: number;
};

export async function getNearbySellers(
  userId: string,
  radiusMeters: number,
  page: number,
  limit: number,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { latitude: true, longitude: true },
  });
  if (
    user?.latitude == null ||
    user?.longitude == null ||
    !Number.isFinite(user.latitude) ||
    !Number.isFinite(user.longitude)
  ) {
    throw new ApiError(
      400,
      "Set your location (latitude/longitude) on your profile to discover nearby sellers",
    );
  }

  const skip = (page - 1) * limit;

  const rows = await prisma.$queryRaw<SellerWithDistance[]>`
    SELECT
      s.id,
      s.email,
      s."businessName",
      s."ownerName",
      s.logo,
      s."coverImage",
      s.bio,
      s.phone,
      s.category::text AS "category",
      s.address,
      s.city,
      s.state,
      s.latitude,
      s.longitude,
      s."isVerified",
      s."isActive",
      s.rating,
      s."totalSales",
      s."createdAt",
      ST_Distance(
        ST_MakePoint(s.longitude, s.latitude)::geography,
        ST_MakePoint(${user.longitude}, ${user.latitude})::geography
      ) AS "distanceMetres"
    FROM "Seller" s
    WHERE s."isActive" = true
      AND s.latitude IS NOT NULL
      AND s.longitude IS NOT NULL
      AND ST_DWithin(
        ST_MakePoint(s.longitude, s.latitude)::geography,
        ST_MakePoint(${user.longitude}, ${user.latitude})::geography,
        ${radiusMeters}
      )
    ORDER BY "distanceMetres" ASC
    LIMIT ${limit} OFFSET ${skip}
  `;

  return {
    sellers: rows,
    userLocation: { lat: user.latitude, lng: user.longitude },
  };
}
