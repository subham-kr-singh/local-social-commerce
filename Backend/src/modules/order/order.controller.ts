import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { prisma } from "../../db/prisma.client.js";
import { getIo } from "../../realtime/io.js";
import type { Prisma } from "../../generated/prisma/index.js";
import { isRazorpayConfigured } from "../../config/razorpay.config.js";

const sellerSelect = {
  select: {
    id: true,
    businessName: true,
    logo: true,
  },
} as const;

const userSelect = {
  select: {
    id: true,
    username: true,
    avatar: true,
    phone: true,
  },
} as const;

function validateStatusTransition(from: string, to: string): boolean {
  const chain = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"];
  const i = chain.indexOf(from);
  const j = chain.indexOf(to);
  return i !== -1 && j !== -1 && j === i + 1;
}

export const createOrderController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const body = req.body as {
    sellerId: string;
    source: "LIVE_STREAM" | "POST" | "DIRECT";
    liveStreamId?: string;
    postId?: string;
    items: { productId: string; quantity: number }[];
    deliveryAddress: Record<string, unknown>;
  };

  const productIds = body.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      sellerId: body.sellerId,
      isActive: true,
    },
    select: { id: true, price: true, stock: true, title: true },
  });

  if (products.length !== productIds.length) {
    throw new ApiError(400, "One or more products are invalid");
  }

  type OrderLineProduct = (typeof products)[number];
  const byId = new Map<string, OrderLineProduct>(
    products.map((p: OrderLineProduct) => [p.id, p]),
  );
  for (const item of body.items) {
    const p = byId.get(item.productId)!;
    if (p.stock < item.quantity) {
      throw new ApiError(400, `Insufficient stock for product ${p.id}`);
    }
  }

  const subtotal = body.items.reduce((sum, item) => {
    const p = byId.get(item.productId)!;
    return sum + p.price * item.quantity;
  }, 0);
  const deliveryFee = 0;
  const total = subtotal + deliveryFee;

  const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.order.create({
      data: {
        userId,
        sellerId: body.sellerId,
        source: body.source,
        liveStreamId: body.source === "LIVE_STREAM" ? body.liveStreamId! : null,
        postId: body.source === "POST" ? body.postId! : null,
        subtotal,
        deliveryFee,
        total,
        deliveryAddress: body.deliveryAddress as any,
        status: "PENDING",
      },
    });

    await tx.orderItem.createMany({
      data: body.items.map((item) => {
        const p = byId.get(item.productId)!;
        return {
          orderId: created.id,
          productId: p.id,
          quantity: item.quantity,
          priceSnapshot: p.price,
          titleSnapshot: p.title,
        };
      }),
    });

    // Atomic stock decrement with guard (prevents negative stock on races)
    for (const item of body.items) {
      const updated = await tx.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (updated.count !== 1) {
        throw new ApiError(400, "Insufficient stock");
      }
    }

    // Notify seller
    await tx.notification.create({
      data: {
        recipientId: body.sellerId,
        recipientType: "SELLER",
        type: "ORDER_CONFIRMED",
        title: "New order received",
        body: "You have a new order",
        data: { orderId: created.id },
      },
    });

    return tx.order.findUnique({
      where: { id: created.id },
      include: {
        seller: sellerSelect,
        items: true,
      },
    });
  });

  // If source=LIVE_STREAM emit purchase event to stream room
  if (body.source === "LIVE_STREAM" && body.liveStreamId) {
    const io = getIo();
    io?.to(`stream:${body.liveStreamId}`).emit("purchase-event", {
      orderId: order!.id,
      userId,
      sellerId: body.sellerId,
      subtotal,
      total,
    });
  }

  res.status(201).json(
    new ApiResponse(201, "Order placed", {
      order,
      ...(isRazorpayConfigured()
        ? {
            payments: {
              razorpay: {
                createCheckout: {
                  method: "POST" as const,
                  path: "/api/v1/payments/razorpay/order",
                  body: { orderId: order!.id },
                },
              },
            },
          }
        : {}),
    }),
  );
});

export const getUserOrdersController = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const page = Number(req.query.page ?? 1) || 1;
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 50);
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const where: any = { userId };
  if (status) where.status = status;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        seller: {
          select: { businessName: true, logo: true },
        },
        items: {
          include: {
            product: { select: { title: true, images: true } },
          },
        },
      },
    }),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Orders fetched", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orders,
    }),
  );
});

export const getSellerOrdersController = asyncHandler(async (req: Request, res: Response) => {
  const sellerId = req.user!.id;
  const page = Number(req.query.page ?? 1) || 1;
  const limit = Math.min(Number(req.query.limit ?? 10) || 10, 50);
  const status = typeof req.query.status === "string" ? req.query.status : undefined;

  const where: any = { sellerId };
  if (status) where.status = status;

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { username: true, avatar: true, phone: true } },
        items: true,
      },
    }),
  ]);

  res.status(200).json(
    new ApiResponse(200, "Orders fetched", {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      orders,
    }),
  );
});

export const getOrderByIdController = asyncHandler(async (req: Request, res: Response) => {
  const id = String(req.params.id);
  const auth = req.user!;

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: userSelect,
      seller: {
        select: { id: true, businessName: true, logo: true, city: true, rating: true },
      },
      items: {
        include: {
          product: true,
        },
      },
    },
  });
  if (!order) throw new ApiError(404, "Order not found");

  const allowed =
    (auth.role === "user" && order.userId === auth.id) ||
    (auth.role === "seller" && order.sellerId === auth.id);
  if (!allowed) throw new ApiError(403, "Access denied");

  res.status(200).json(new ApiResponse(200, "Order fetched", { order }));
});

export const updateOrderStatusController = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user!.id;
    const id = String(req.params.id);
    const body = req.body as { status: string };

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) throw new ApiError(404, "Order not found");
    if (order.sellerId !== sellerId) throw new ApiError(403, "Access denied");

    if (!validateStatusTransition(order.status, body.status)) {
      throw new ApiError(400, "Invalid status transition");
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status: body.status as any },
      include: {
        user: userSelect,
        seller: sellerSelect,
        items: true,
      },
    });

    if (body.status === "DELIVERED") {
      await prisma.seller.update({
        where: { id: sellerId },
        data: { totalSales: { increment: 1 } },
      });
    }

    // Notify user and emit to user room
    if (body.status === "SHIPPED" || body.status === "DELIVERED") {
      const notifType = body.status === "SHIPPED" ? "ORDER_SHIPPED" : "ORDER_DELIVERED";
      const notification = await prisma.notification.create({
        data: {
          recipientId: updated.userId,
          recipientType: "USER",
          type: notifType as any,
          title: `Order ${body.status.toLowerCase()}`,
          body: `Your order is ${body.status.toLowerCase()}`,
          data: { orderId: updated.id, status: body.status },
        },
      });
      getIo()?.to(`user:${updated.userId}`).emit("notification", notification);
    }

    res.status(200).json(new ApiResponse(200, "Order status updated", { order: updated }));
  },
);
