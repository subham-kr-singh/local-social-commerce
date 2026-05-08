import type { Request, Response } from "express";
import { asyncHandler } from "../../shared/utils/asyncHandler.js";
import { ApiResponse } from "../../shared/utils/ApiResponse.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import {
  COOKIE_NAME,
  REFRESH_TOKEN_COOKIE_MAX_AGE,
} from "../../config/constants.js";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.client.js";
import {
  registerUser,
  loginUser,
  refreshUserTokens,
  logoutUser,
  registerSeller,
  loginSeller,
  refreshSellerTokens,
  logoutSeller,
  verifyRefreshToken,
} from "./auth.service.js";

// ── Cookie helper ─────────────────────────────────────────────────────────────

const setRefreshCookie = (res: Response, token: string): void => {
  res.cookie(COOKIE_NAME.REFRESH_TOKEN, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: REFRESH_TOKEN_COOKIE_MAX_AGE,
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(COOKIE_NAME.REFRESH_TOKEN, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
  });
};

// ── User Controllers ──────────────────────────────────────────────────────────

export const registerUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await registerUser(req.body);
    res
      .status(201)
      .json(new ApiResponse(201, "Registration successful", { user }));
  },
);

export const loginUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const { user, tokens } = await loginUser(req.body);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(200).json(
      new ApiResponse(200, "Login successful", {
        user,
        accessToken: tokens.accessToken,
      }),
    );
  },
);

export const refreshUserTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    const raw = req.cookies?.[COOKIE_NAME.REFRESH_TOKEN] as string | undefined;
    if (!raw) throw new ApiError(401, "No refresh token provided");

    const tokens = await refreshUserTokens(raw);
    setRefreshCookie(res, tokens.refreshToken);
    res
      .status(200)
      .json(
        new ApiResponse(200, "Token refreshed", {
          accessToken: tokens.accessToken,
        }),
      );
  },
);

export const logoutUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const raw = req.cookies?.[COOKIE_NAME.REFRESH_TOKEN] as string | undefined;

    if (raw) {
      try {
        const payload = verifyRefreshToken(raw);
        await logoutUser(payload.tokenId);
      } catch {
        // Token unreadable — still clear the cookie
      }
    }

    clearRefreshCookie(res);
    res.status(200).json(new ApiResponse(200, "Logged out successfully", null));
  },
);

export const getMeUserController = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatar: true,
        bio: true,
        phone: true,
        city: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!user) throw new ApiError(404, "User not found");
    res.status(200).json(new ApiResponse(200, "User fetched", { user }));
  },
);

// ── Seller Controllers ────────────────────────────────────────────────────────

export const registerSellerController = asyncHandler(
  async (req: Request, res: Response) => {
    const seller = await registerSeller(req.body);
    res
      .status(201)
      .json(new ApiResponse(201, "Seller registration successful", { seller }));
  },
);

export const loginSellerController = asyncHandler(
  async (req: Request, res: Response) => {
    const { seller, tokens } = await loginSeller(req.body);
    setRefreshCookie(res, tokens.refreshToken);
    res.status(200).json(
      new ApiResponse(200, "Login successful", {
        seller,
        accessToken: tokens.accessToken,
      }),
    );
  },
);

export const refreshSellerTokenController = asyncHandler(
  async (req: Request, res: Response) => {
    const raw = req.cookies?.[COOKIE_NAME.REFRESH_TOKEN] as string | undefined;
    if (!raw) throw new ApiError(401, "No refresh token provided");

    const tokens = await refreshSellerTokens(raw);
    setRefreshCookie(res, tokens.refreshToken);
    res
      .status(200)
      .json(
        new ApiResponse(200, "Token refreshed", {
          accessToken: tokens.accessToken,
        }),
      );
  },
);

export const logoutSellerController = asyncHandler(
  async (req: Request, res: Response) => {
    const raw = req.cookies?.[COOKIE_NAME.REFRESH_TOKEN] as string | undefined;

    if (raw) {
      try {
        const payload = verifyRefreshToken(raw);
        await logoutSeller(payload.tokenId);
      } catch {
        // Ignore — still clear cookie
      }
    }

    clearRefreshCookie(res);
    res.status(200).json(new ApiResponse(200, "Logged out successfully", null));
  },
);

export const getMeSellerController = asyncHandler(
  async (req: Request, res: Response) => {
    const seller = await prisma.seller.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        businessName: true,
        ownerName: true,
        logo: true,
        coverImage: true,
        bio: true,
        phone: true,
        category: true,
        city: true,
        address: true,
        isVerified: true,
        rating: true,
        totalSales: true,
        createdAt: true,
      },
    });
    if (!seller) throw new ApiError(404, "Seller not found");
    res.status(200).json(new ApiResponse(200, "Seller fetched", { seller }));
  },
);
