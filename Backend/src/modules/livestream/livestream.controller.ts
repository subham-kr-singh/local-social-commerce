import type { Request, Response } from "express";
import { RtcRole, RtcTokenBuilder } from "agora-token";
import { agoraConfig } from "../../config/agora.config.js";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { prisma } from "../../db/prisma.client.js";
import { getRedis } from "../../db/redis.client.js";
import {
  emitProductPinned,
  emitProductUnpinned,
  emitStreamEnded,
  emitStreamStarted,
} from "../../realtime/livestream.events.js";

const sellerSelect = {
  select: {
    id: true,
    businessName: true,
    logo: true,
    city: true,
    rating: true,
  },
} as const;

const streamInclude = {
  seller: sellerSelect,
  liveProducts: {
    include: {
      product: true,
    },
  },
} as const;

function viewerKey(streamId: string): string {
  return `livestream:${streamId}:viewers`;
}

async function attachViewerCounts(streams: any[]): Promise<any[]> {
  const redis = getRedis();
  if (!redis) return streams;
  const liveIds = streams.filter((s) => s.status === "LIVE").map((s) => s.id as string);
  if (!liveIds.length) return streams;
  const keys = liveIds.map(viewerKey);
  const counts = await redis.mget(...keys);
  const map = new Map<string, number>();
  liveIds.forEach((id, idx) => map.set(id, parseInt(counts[idx] ?? "0", 10) || 0));
  return streams.map((s) =>
    s.status === "LIVE" ? { ...s, viewerCount: map.get(s.id) ?? 0 } : s,
  );
}

async function notifyFollowersStreamLive(sellerId: string, streamId: string, scheduledAt?: Date) {
  const followers = await prisma.follow.findMany({
    where: { sellerId },
    select: { userId: true },
  });
  if (!followers.length) return;

  await prisma.notification.createMany({
    data: followers.map((f) => ({
      recipientId: f.userId,
      recipientType: "USER",
      type: "STREAM_LIVE",
      title: "Stream live",
      body: "A seller you follow is live now",
      data: {
        streamId,
        sellerId,
        ...(scheduledAt ? { scheduledAt: scheduledAt.toISOString() } : {}),
      },
    })),
  });
}

export const createStreamController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const body = req.body as {
    title: string;
    description?: string;
    thumbnail?: string;
    scheduledAt?: Date;
  };

  const stream = await prisma.liveStream.create({
    data: {
      sellerId,
      title: body.title,
      description: body.description ?? null,
      thumbnail: body.thumbnail ?? null,
      scheduledAt: body.scheduledAt ?? null,
      status: "SCHEDULED",
      // streamKey auto-generated; used as Agora channel name
    },
    include: { seller: sellerSelect },
  });

  await notifyFollowersStreamLive(sellerId, stream.id, body.scheduledAt);

  res.status(201).json(new ApiResponse(201, "Stream scheduled", { stream }));
});

export const getStreamsController = asyncHandler(async (req: Request, res: Response) => {
  const page = Number(req.query.page ?? 1) || 1;
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 50);
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const city = typeof req.query.city === "string" ? req.query.city : undefined;

  const where: any = {};
  if (status) where.status = status;
  if (city) where.seller = { city: { equals: city, mode: "insensitive" } };

  const [total, streams] = await Promise.all([
    prisma.liveStream.count({ where }),
    prisma.liveStream.findMany({
      where,
      include: { seller: sellerSelect },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const withCounts = await attachViewerCounts(streams as any[]);

  res.status(200).json(
    new ApiResponse(200, "Streams fetched", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      streams: withCounts,
    }),
  );
});

export const getStreamByIdController = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const stream = await prisma.liveStream.findUnique({
    where: { id },
    include: streamInclude,
  });
  if (!stream) throw new ApiError(404, "Stream not found");

  let viewerCount = stream.viewerCount;
  if (stream.status === "LIVE") {
    const redis = getRedis();
    if (redis) {
      viewerCount = parseInt((await redis.get(viewerKey(id))) ?? "0", 10) || 0;
    }
  }

  res.status(200).json(
    new ApiResponse(200, "Stream fetched", {
      stream: { ...stream, viewerCount },
    }),
  );
});

export const startStreamController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const id = String(req.params.id);

  const stream = await prisma.liveStream.findUnique({ where: { id } });
  if (!stream) throw new ApiError(404, "Stream not found");
  if (stream.sellerId !== sellerId) throw new ApiError(403, "You do not own this stream");
  if (stream.status !== "SCHEDULED") throw new ApiError(400, "Stream is not schedulable to start");

  const updated = await prisma.liveStream.update({
    where: { id },
    data: { status: "LIVE", startedAt: new Date() },
    include: { seller: sellerSelect },
  });

  const redis = getRedis();
  if (redis) await redis.set(viewerKey(id), "0");

  emitStreamStarted({ streamId: id, sellerId, title: updated.title });
  await notifyFollowersStreamLive(sellerId, id);

  res.status(200).json(new ApiResponse(200, "Stream started", { stream: updated }));
});

export const endStreamController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const id = String(req.params.id);
  const body = req.body as { playbackUrl?: string };

  const stream = await prisma.liveStream.findUnique({ where: { id } });
  if (!stream) throw new ApiError(404, "Stream not found");
  if (stream.sellerId !== sellerId) throw new ApiError(403, "You do not own this stream");
  if (stream.status !== "LIVE") throw new ApiError(400, "Stream is not live");

  const redis = getRedis();
  const currentViewers =
    redis ? parseInt((await redis.get(viewerKey(id))) ?? "0", 10) || 0 : 0;
  const peakViewers = Math.max(stream.peakViewers, currentViewers);

  const updated = await prisma.liveStream.update({
    where: { id },
    data: {
      status: "ENDED",
      endedAt: new Date(),
      playbackUrl: body.playbackUrl ?? null,
      peakViewers,
      viewerCount: currentViewers,
    },
    include: { seller: sellerSelect },
  });

  if (redis) await redis.del(viewerKey(id));
  emitStreamEnded({ streamId: id, sellerId });

  res.status(200).json(new ApiResponse(200, "Stream ended", { stream: updated }));
});

export const generateAgoraTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = req.user!;
    const id = String(req.params.id);
    const body = req.body as { role: "host" | "audience" };

    const stream = await prisma.liveStream.findUnique({ where: { id } });
    if (!stream) throw new ApiError(404, "Stream not found");

    if (body.role === "host") {
      if (user.role !== "seller") throw new ApiError(403, "Only sellers can request host token");
      if (user.id !== stream.sellerId) throw new ApiError(403, "You do not own this stream");
    }

    const expiresIn = 3600;
    const expirationTimeInSeconds = Math.floor(Date.now() / 1000) + expiresIn;

    if (!agoraConfig.appId || !agoraConfig.appCertificate) {
      throw new ApiError(500, "Agora is not configured");
    }

    const rtcRole = body.role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const uid = 0;

    const token = RtcTokenBuilder.buildTokenWithUid(
      agoraConfig.appId,
      agoraConfig.appCertificate,
      stream.streamKey,
      uid,
      rtcRole,
      expirationTimeInSeconds,
      expirationTimeInSeconds,
    );

    res.status(200).json(
      new ApiResponse(200, "Agora token generated", {
        token,
        channel: stream.streamKey,
        appId: agoraConfig.appId,
        uid,
        expiresIn,
      }),
    );
  },
);

export const pinProductController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const streamId = String(req.params.id);
  const body = req.body as { productId: string; isPinned: boolean; displayOrder: number };

  const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
  if (!stream) throw new ApiError(404, "Stream not found");
  if (stream.sellerId !== sellerId) throw new ApiError(403, "You do not own this stream");

  const product = await prisma.product.findUnique({ where: { id: body.productId } });
  if (!product) throw new ApiError(404, "Product not found");
  if (product.sellerId !== sellerId) throw new ApiError(403, "You do not own this product");

  const liveStreamProduct = await prisma.liveStreamProduct.upsert({
    where: {
      liveStreamId_productId: { liveStreamId: streamId, productId: body.productId },
    },
    create: {
      liveStreamId: streamId,
      productId: body.productId,
      isPinned: body.isPinned,
      displayOrder: body.displayOrder,
    },
    update: {
      isPinned: body.isPinned,
      displayOrder: body.displayOrder,
    },
    include: { product: true },
  });

  emitProductPinned({
    streamId,
    product: liveStreamProduct.product,
    isPinned: liveStreamProduct.isPinned,
    displayOrder: liveStreamProduct.displayOrder,
  });

  res.status(200).json(
    new ApiResponse(200, "Product pinned", { liveStreamProduct }),
  );
});

export const unpinProductController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const streamId = String(req.params.id);
  const productId = String(req.params.productId);

  const stream = await prisma.liveStream.findUnique({ where: { id: streamId } });
  if (!stream) throw new ApiError(404, "Stream not found");
  if (stream.sellerId !== sellerId) throw new ApiError(403, "You do not own this stream");

  await prisma.liveStreamProduct.delete({
    where: { liveStreamId_productId: { liveStreamId: streamId, productId } },
  });

  emitProductUnpinned({ streamId, productId });
  res.status(200).json(new ApiResponse(200, "Product unpinned", null));
});
