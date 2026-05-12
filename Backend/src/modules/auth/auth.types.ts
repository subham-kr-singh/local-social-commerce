import { z } from "zod";
import { ROLES, SELLER_CATEGORIES } from "../../config/constants.js";

// ── JWT Payloads ──────────────────────────────────────────────────────────────

export interface JwtAuthPayload {
  id: string;
  email: string;
  role: "user" | "seller";
}

export interface JwtRefreshPayload {
  id: string;
  tokenId: string; // RefreshToken.id in DB — used for revocation
  role: "user" | "seller";
}

// ── Zod Schemas ──────────────────────────────────────────────────────────────

export const registerUserSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one number"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username cannot exceed 20 characters")
    .regex(
      /^\w+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  fullName: z.string().min(2, "Full name must be at least 2 characters").trim(),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone must be 10 digits")
    .optional(),
  city: z.string().trim().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSellerSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/\d/, "Password must contain at least one number"),
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .trim(),
  ownerName: z
    .string()
    .min(2, "Owner name must be at least 2 characters")
    .trim(),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  category: z.enum(SELLER_CATEGORIES, { error: "Invalid category" }),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

// ── Inferred Types ────────────────────────────────────────────────────────────

export type RegisterUserInput = z.infer<typeof registerUserSchema>;
export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

// ── Service Return Types ──────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string; // raw — stored only in httpOnly cookie, never in DB
}

export interface UserAuthResult {
  user: SafeUser;
  tokens: AuthTokens;
}

export interface SellerAuthResult {
  seller: SafeSeller;
  tokens: AuthTokens;
}

// DB rows with password stripped
export type SafeUser = {
  id: string;
  email: string;
  username: string;
  fullName: string;
  avatar: string | null;
  phone: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  createdAt: Date;
};

export type SafeSeller = {
  id: string;
  email: string;
  businessName: string;
  ownerName: string;
  logo: string | null;
  phone: string;
  category: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  rating: number;
  totalSales: number;
  createdAt: Date;
};
