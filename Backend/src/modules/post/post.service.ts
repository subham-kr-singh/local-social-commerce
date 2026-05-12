import { prisma } from "../../db/prisma.client.js";
import { ApiError } from "../../shared/utils/ApiError.js";

export class PostService {
  static async verifySellerOwnsProductsOrThrow(
    sellerId: string,
    productIds: string[],
  ): Promise<void> {
    if (!productIds.length) return;
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, sellerId },
      select: { id: true },
    });
    if (products.length !== productIds.length) {
      throw new ApiError(400, "One or more products are invalid or not owned by seller");
    }
  }

  static async getSellerCity(sellerId: string): Promise<string | null> {
    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: { city: true },
    });
    return seller?.city ?? null;
  }

  static assertMediaMatchesType(
    files: Express.Multer.File[],
    mediaType: "IMAGE" | "VIDEO",
  ): void {
    if (!files.length) throw new ApiError(400, "At least one media file is required");
    if (files.length > 5) throw new ApiError(400, "Up to 5 media files are allowed");

    const isImage = (m: string) => /^image\//i.test(m);
    const isVideo = (m: string) => /^video\//i.test(m);

    const ok =
      mediaType === "IMAGE"
        ? files.every((f) => isImage(f.mimetype))
        : files.every((f) => isVideo(f.mimetype));

    if (!ok) {
      throw new ApiError(
        400,
        mediaType === "IMAGE"
          ? "All uploaded files must be images for mediaType=IMAGE"
          : "All uploaded files must be videos for mediaType=VIDEO",
      );
    }
  }
}
