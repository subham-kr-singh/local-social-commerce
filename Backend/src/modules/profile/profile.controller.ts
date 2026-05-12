import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { uploadBufferToImageKit, resolveUploadedFileUrl } from "../../shared/utils/imagekitUpload.js";
import {
  getUserProfile,
  updateUserProfile,
  getSellerProfile,
  updateSellerProfile,
} from "./profile.service.js";

export const getUserProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const data = await getUserProfile(userId);
    res.status(200).json(new ApiResponse(200, "Profile", data));
  },
);

export const patchUserProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new ApiError(401, "Unauthorized");
    const body = req.body as {
      fullName?: string | undefined;
      bio?: string | undefined;
      phone?: string | undefined;
      city?: string | undefined;
      state?: string | undefined;
      latitude?: number | undefined;
      longitude?: number | undefined;
    };

    let avatarUrl: string | undefined;
    const file = req.file;
    if (file?.buffer?.length) {
      const uploaded = await uploadBufferToImageKit({
        fileBuffer: file.buffer,
        fileName: file.originalname || "avatar.jpg",
        folder: "avatars/users",
        tags: ["avatar", `user:${userId}`],
      });
      avatarUrl = resolveUploadedFileUrl(uploaded);
    }

    const user = await updateUserProfile(userId, {
      ...body,
      ...(avatarUrl ? { avatar: avatarUrl } : {}),
    });

    res.status(200).json(new ApiResponse(200, "Profile updated", { user }));
  },
);

export const getSellerProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user?.id;
    if (!sellerId) throw new ApiError(401, "Unauthorized");
    const data = await getSellerProfile(sellerId);
    res.status(200).json(new ApiResponse(200, "Seller profile", data));
  },
);

export const patchSellerProfileController = asyncHandler(
  async (req: Request, res: Response) => {
    const sellerId = req.user?.id;
    if (!sellerId) throw new ApiError(401, "Unauthorized");
    const body = req.body as {
      businessName?: string | undefined;
      ownerName?: string | undefined;
      bio?: string | undefined;
      phone?: string | undefined;
      city?: string | undefined;
      state?: string | undefined;
      address?: string | undefined;
      latitude?: number | undefined;
      longitude?: number | undefined;
    };

    const files = req.files as
      | Record<string, Express.Multer.File[]>
      | undefined;

    let logoUrl: string | undefined;
    let coverUrl: string | undefined;

    const logoFile = files?.logo?.[0];
    if (logoFile?.buffer?.length) {
      const uploaded = await uploadBufferToImageKit({
        fileBuffer: logoFile.buffer,
        fileName: logoFile.originalname || "logo.jpg",
        folder: "shop/logos",
        tags: ["logo", `seller:${sellerId}`],
      });
      logoUrl = resolveUploadedFileUrl(uploaded);
    }

    const coverFile = files?.coverImage?.[0];
    if (coverFile?.buffer?.length) {
      const uploaded = await uploadBufferToImageKit({
        fileBuffer: coverFile.buffer,
        fileName: coverFile.originalname || "cover.jpg",
        folder: "shop/covers",
        tags: ["cover", `seller:${sellerId}`],
      });
      coverUrl = resolveUploadedFileUrl(uploaded);
    }

    const seller = await updateSellerProfile(sellerId, {
      ...body,
      ...(logoUrl ? { logo: logoUrl } : {}),
      ...(coverUrl ? { coverImage: coverUrl } : {}),
    });

    res
      .status(200)
      .json(new ApiResponse(200, "Seller profile updated", { seller }));
  },
);
