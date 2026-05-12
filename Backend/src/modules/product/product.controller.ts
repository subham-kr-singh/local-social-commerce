import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { prisma } from "../../db/prisma.client.js";
import { getRedis } from "../../db/redis.client.js";
import { uploadBufferToImageKit } from "../../shared/utils/imagekitUpload.js";
import type { Prisma } from "../../generated/prisma/index.js";

type ImageKitUploadResult = Awaited<ReturnType<typeof uploadBufferToImageKit>>;

const productInclude = {
  seller: {
    select: {
      id: true,
      businessName: true,
      logo: true,
      city: true,
      rating: true,
    },
  },
} as const;

function productsCacheKey(params: {
  city?: string;
  page: number;
  limit: number;
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sellerId?: string;
  sortBy?: string;
}): string {
  const city = (params.city ?? "all").toLowerCase();
  const parts = [
    `products:city:${city}`,
    `page:${params.page}`,
    `limit:${params.limit}`,
    `search:${params.search ?? "none"}`,
    `category:${params.category ?? "none"}`,
    `min:${params.minPrice ?? "none"}`,
    `max:${params.maxPrice ?? "none"}`,
    `inStock:${params.inStock ?? "any"}`,
    `seller:${params.sellerId ?? "all"}`,
    `sort:${params.sortBy ?? "newest"}`,
  ];
  return parts.join("|");
}

function productOrderBy(sortBy: string): Prisma.ProductOrderByWithRelationInput {
  switch (sortBy) {
    case "oldest":
      return { createdAt: "asc" };
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "newest":
    default:
      return { createdAt: "desc" };
  }
}

export const createProductController = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user!.id;
    const body = req.body as {
      title: string;
      description: string;
      price: number;
      discountPrice?: number;
      stock: number;
      category: string;
      tags?: string[];
    };

    const files = (req.files ?? []) as Express.Multer.File[];
    if (!files.length) throw new ApiError(400, "At least one product image is required");
    if (files.length > 5) throw new ApiError(400, "Up to 5 images are allowed");

    const uploads = await Promise.all(
      files.map((f: Express.Multer.File) =>
        uploadBufferToImageKit({
          fileBuffer: f.buffer,
          fileName: f.originalname,
          folder: `/products/${sellerId}`,
          tags: ["product"],
        }),
      ),
    );
    const imageUrls = uploads.map((u: ImageKitUploadResult) => u.url as string);

    const product = await prisma.product.create({
      data: {
        sellerId,
        title: body.title,
        description: body.description,
        price: body.price,
        discountPrice: body.discountPrice ?? null,
        stock: body.stock,
        category: body.category,
        tags: body.tags ?? [],
        images: imageUrls,
        isActive: true,
      },
      include: productInclude,
    });

    res.status(201).json(new ApiResponse(201, "Product created", { product }));
  },
);

export const getPublicProductsController = asyncHandler(
  async (req: Request, res: Response) => {
    const page = Number(req.query.page ?? 1) || 1;
    const limit = Math.min(Number(req.query.limit ?? 12) || 12, 50);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const sellerId = typeof req.query.sellerId === "string" ? req.query.sellerId : undefined;
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const minPriceRaw =
      req.query.minPrice !== undefined ? Number(req.query.minPrice) : undefined;
    const maxPriceRaw =
      req.query.maxPrice !== undefined ? Number(req.query.maxPrice) : undefined;
    const minPrice = Number.isFinite(minPriceRaw) ? minPriceRaw : undefined;
    const maxPrice = Number.isFinite(maxPriceRaw) ? maxPriceRaw : undefined;
    const inStock =
      typeof req.query.inStock === "string" ? req.query.inStock === "true" : undefined;
    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "newest";

    const redis = getRedis();
    const cacheKey = productsCacheKey({
      page,
      limit,
      ...(search ? { search } : {}),
      ...(category ? { category } : {}),
      ...(sellerId ? { sellerId } : {}),
      ...(city ? { city } : {}),
      ...(minPrice !== undefined ? { minPrice } : {}),
      ...(maxPrice !== undefined ? { maxPrice } : {}),
      ...(inStock !== undefined ? { inStock } : {}),
      sortBy,
    });

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.status(200).json(JSON.parse(cached));
        return;
      }
    }

    const where: any = { isActive: true };

    if (sellerId) where.sellerId = sellerId;
    if (category) where.category = { equals: category, mode: "insensitive" };
    if (city) where.seller = { city: { equals: city, mode: "insensitive" } };

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {
        ...(minPrice !== undefined ? { gte: minPrice } : {}),
        ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
      };
    }

    if (inStock === true) where.stock = { gt: 0 };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    const orderBy = productOrderBy(sortBy);

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    const responseBody = new ApiResponse(200, "Products fetched", {
      products,
      total,
      page,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
      limit,
    });

    if (redis) await redis.setex(cacheKey, 120, JSON.stringify(responseBody));
    res.status(200).json(responseBody);
  },
);

export const getMyProductsController = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user!.id;
    const page = Number(req.query.page ?? 1) || 1;
    const limit = Math.min(Number(req.query.limit ?? 12) || 12, 50);
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const sortBy = typeof req.query.sortBy === "string" ? req.query.sortBy : "newest";

    const where: any = { sellerId };
    if (category) where.category = { equals: category, mode: "insensitive" };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    const orderBy = productOrderBy(sortBy);

    const [total, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: productInclude,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);
    res.status(200).json(
      new ApiResponse(200, "My products fetched", {
        products,
        total,
        page,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit,
      }),
    );
  },
);

export const getProductByIdController = asyncHandler(
  async (req: Request, res: Response) => {
    const id = String(req.params.id);
    const redis = getRedis();
    const cacheKey = `product:${id}`;

    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        res.status(200).json(JSON.parse(cached));
        return;
      }
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product || !product.isActive) throw new ApiError(404, "Product not found");

    const responseBody = new ApiResponse(200, "Product fetched", { product });
    if (redis) await redis.setex(cacheKey, 300, JSON.stringify(responseBody));
    res.status(200).json(responseBody);
  },
);

export const updateProductController = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user!.id;
    const id = String(req.params.id);
    const body = req.body as Record<string, unknown> & {
      title?: string;
      description?: string;
      price?: number;
      discountPrice?: number;
      stock?: number;
      category?: string;
      tags?: string[];
      isActive?: boolean;
    };

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Product not found");
    if (existing.sellerId !== sellerId) throw new ApiError(403, "Not authorized");

    const files = (req.files ?? []) as Express.Multer.File[];
    let images: string[] | undefined = undefined;
    if (files.length) {
      const uploads = await Promise.all(
        files.map((f: Express.Multer.File) =>
          uploadBufferToImageKit({
            fileBuffer: f.buffer,
            fileName: f.originalname,
            folder: `/products/${sellerId}`,
            tags: ["product"],
          }),
        ),
      );
      images = uploads.map((u: ImageKitUploadResult) => u.url as string);
    }

    const updateData: any = {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.price !== undefined ? { price: body.price } : {}),
      ...(body.discountPrice !== undefined ? { discountPrice: body.discountPrice } : {}),
      ...(body.stock !== undefined ? { stock: body.stock } : {}),
      ...(body.category !== undefined ? { category: body.category } : {}),
      ...(body.tags !== undefined ? { tags: body.tags } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(images !== undefined ? { images } : {}),
    };

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
      include: productInclude,
    });

    const redis = getRedis();
    if (redis) await redis.del(`product:${id}`);

    res.status(200).json(new ApiResponse(200, "Product updated", { product }));
  },
);

export const deleteProductController = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user!.id;
    const id = String(req.params.id);

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) throw new ApiError(404, "Product not found");
    if (existing.sellerId !== sellerId) throw new ApiError(403, "Not authorized");

    await prisma.product.update({ where: { id }, data: { isActive: false } });

    const redis = getRedis();
    if (redis) await redis.del(`product:${id}`);

    res.status(200).json(new ApiResponse(200, "Product deleted", null));
  },
);
