import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { prisma } from "../../db/prisma.client.js";
import { getRedis } from "../../db/redis.client.js";
import { uploadBufferToImageKit } from "../../shared/utils/imagekitUpload.js";
import { PostService } from "./post.service.js";
import { emitNewPost } from "../../realtime/post.events.js";

function feedCacheKey(params: {
  city?: string;
  sellerId?: string;
  page: number;
  limit: number;
}): string {
  const city = (params.city ?? "all").toLowerCase();
  const seller = params.sellerId ?? "all";
  return `feed:city:${city}:seller:${seller}:page:${params.page}:limit:${params.limit}`;
}

async function invalidateFeedCacheForCity(city: string | null): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const normalized = (city ?? "all").toLowerCase();
  const pattern = `feed:city:${normalized}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length) await redis.del(keys);
}

const postInclude = {
  seller: {
    select: {
      id: true,
      businessName: true,
      logo: true,
      city: true,
    },
  },
  postProducts: {
    include: {
      product: true,
    },
  },
} as const;

export const createPostController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const body = req.body as {
    caption: string;
    mediaType: "IMAGE" | "VIDEO";
    productIds?: string[];
  };
  const mediaType = body.mediaType;

  const files = (req.files ?? []) as Express.Multer.File[];
  PostService.assertMediaMatchesType(files, mediaType);

  const productIds = body.productIds ?? [];
  await PostService.verifySellerOwnsProductsOrThrow(sellerId, productIds);

  const uploads = await Promise.all(
    files.map((f: Express.Multer.File) =>
      uploadBufferToImageKit({
        fileBuffer: f.buffer,
        fileName: f.originalname,
        folder: `/posts/${sellerId}`,
        tags: ["post", mediaType.toLowerCase()],
      }),
    ),
  );

  const mediaUrls = uploads.map((u) => u.url as string);

  const post = await prisma.post.create({
    data: {
      sellerId,
      caption: body.caption,
      mediaUrls,
      mediaType,
    },
    include: postInclude,
  });

  if (productIds.length) {
    await prisma.postProduct.createMany({
      data: productIds.map((productId) => ({ postId: post.id, productId })),
      skipDuplicates: true,
    });
  }

  const postWithTags = await prisma.post.findUnique({
    where: { id: post.id },
    include: postInclude,
  });

  const city = await PostService.getSellerCity(sellerId);
  await invalidateFeedCacheForCity(city);

  const followers = await prisma.follow.findMany({
    where: { sellerId },
    select: { userId: true },
  });

  await emitNewPost({
    postId: post.id,
    sellerId,
    city,
    followerUserIds: followers.map((f: { userId: string }) => f.userId),
  });

  res
    .status(201)
    .json(new ApiResponse(201, "Post created", { post: postWithTags }));
});

export const getPublicPostsController = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1) || 1;
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 50);
  const sellerId = typeof req.query.sellerId === "string" ? req.query.sellerId : undefined;
  const city = typeof req.query.city === "string" ? req.query.city : undefined;

  const redis = getRedis();
  const key = feedCacheKey({
    page,
    limit,
    ...(city ? { city } : {}),
    ...(sellerId ? { sellerId } : {}),
  });
  if (redis) {
    const cached = await redis.get(key);
    if (cached) {
      res.status(200).json(JSON.parse(cached));
      return;
    }
  }

  const where: any = {};
  if (sellerId) where.sellerId = sellerId;
  if (city) where.seller = { city: { equals: city, mode: "insensitive" } };

  const [total, posts] = await Promise.all([
    prisma.post.count({ where }),
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const responseBody = new ApiResponse(200, "Posts fetched", {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    posts,
  });

  if (redis) {
    await redis.setex(key, 120, JSON.stringify(responseBody));
  }

  res.status(200).json(responseBody);
});

export const getPostByIdController = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({
    where: { id },
    include: postInclude,
  });
  if (!post) throw new ApiError(404, "Post not found");

  const likes = await prisma.like.count({
    where: { targetId: id, targetType: "POST" },
  });

  res.status(200).json(new ApiResponse(200, "Post fetched", { post: { ...post, _count: { likes } } }));
});

export const updatePostController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const postId = String(req.params.id);
  const body = req.body as { caption?: string; productIds?: string[] };

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, sellerId: true },
  });
  if (!existing) throw new ApiError(404, "Post not found");
  if (existing.sellerId !== sellerId) throw new ApiError(403, "You do not own this post");

  const productIds = body.productIds;
  if (productIds) await PostService.verifySellerOwnsProductsOrThrow(sellerId, productIds);

  if (productIds) {
    await prisma.postProduct.deleteMany({ where: { postId } });
    if (productIds.length) {
      await prisma.postProduct.createMany({
        data: productIds.map((productId) => ({ postId, productId })),
        skipDuplicates: true,
      });
    }
  }

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...(body.caption !== undefined ? { caption: body.caption } : {}),
    },
    include: postInclude,
  });

  const city = await PostService.getSellerCity(sellerId);
  await invalidateFeedCacheForCity(city);

  res.status(200).json(new ApiResponse(200, "Post updated", { post: updated }));
});

export const deletePostController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const postId = String(req.params.id);

  const existing = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, sellerId: true },
  });
  if (!existing) throw new ApiError(404, "Post not found");
  if (existing.sellerId !== sellerId) throw new ApiError(403, "You do not own this post");

  await prisma.post.delete({ where: { id: postId } });

  const city = await PostService.getSellerCity(sellerId);
  await invalidateFeedCacheForCity(city);

  res.status(200).json(new ApiResponse(200, "Post deleted", null));
});

export const getPostProductsController = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      postProducts: {
        include: { product: true },
      },
    },
  });
  if (!post) throw new ApiError(404, "Post not found");

  const products = post.postProducts.map((pp: { product: unknown }) => pp.product);
  res.status(200).json(new ApiResponse(200, "Post products fetched", { products }));
});
