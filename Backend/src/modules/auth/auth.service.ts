import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma.client.js";
import { env } from "../../config/env.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import type {
  RegisterUserInput,
  RegisterSellerInput,
  LoginInput,
  AuthTokens,
  UserAuthResult,
  SellerAuthResult,
  JwtAuthPayload,
  JwtRefreshPayload,
  SafeUser,
  SafeSeller,
} from "./auth.types.js";

// ── Token helpers (private to this module) ────────────────────────────────────

const signAccess = (payload: JwtAuthPayload): string =>
  jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRY as any,
    issuer: "social-commerce",
    audience: "social-commerce-app",
  });

const signRefresh = (payload: JwtRefreshPayload): string =>
  jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY as any,
    issuer: "social-commerce",
    audience: "social-commerce-app",
  });

export const verifyAccessToken = (token: string): JwtAuthPayload => {
  try {
    return jwt.verify(token, env.JWT_ACCESS_SECRET, {
      issuer: "social-commerce",
      audience: "social-commerce-app",
    }) as JwtAuthPayload;
  } catch {
    throw new ApiError(401, "Token expired or invalid");
  }
};

export const verifyRefreshToken = (token: string): JwtRefreshPayload => {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: "social-commerce",
      audience: "social-commerce-app",
    }) as JwtRefreshPayload;
  } catch {
    throw new ApiError(401, "Session expired — please log in again");
  }
};

const refreshTokenExpiry = (): Date => {
  const days = parseInt(env.JWT_REFRESH_EXPIRY) || 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

// ── User Auth ─────────────────────────────────────────────────────────────────

export const registerUser = async (
  data: RegisterUserInput,
): Promise<SafeUser> => {
  const [emailTaken, usernameTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: data.email } }),
    prisma.user.findUnique({ where: { username: data.username } }),
  ]);

  if (emailTaken) throw new ApiError(409, "Email is already registered");
  if (usernameTaken) throw new ApiError(409, "Username is already taken");

  const hashed = await bcrypt.hash(data.password, parseInt(env.BCRYPT_ROUNDS));

  const user = await prisma.user.create({
    data: {
      email: data.email,
      password: hashed,
      username: data.username,
      fullName: data.fullName,
      phone: data.phone ?? null,
      city: data.city ?? null,
    },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      avatar: true,
      phone: true,
      city: true,
      isVerified: true,
      createdAt: true,
    },
  });

  return user;
};

export const loginUser = async (data: LoginInput): Promise<UserAuthResult> => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) throw new ApiError(401, "Invalid email or password");

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  if (!user.isActive)
    throw new ApiError(403, "Your account has been deactivated");

  // 1. Issue access token
  const accessToken = signAccess({
    id: user.id,
    email: user.email,
    role: "user",
  });

  // 2. Save a placeholder refresh token to DB to get its ID
  const rawRefresh = crypto.randomUUID(); // temporary — replaced below
  const hashedRefresh = await bcrypt.hash(
    rawRefresh,
    parseInt(env.BCRYPT_ROUNDS),
  );

  const tokenRecord = await prisma.refreshToken.create({
    data: {
      token: hashedRefresh,
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  // 3. Issue refresh token with actual tokenId embedded
  const refreshToken = signRefresh({
    id: user.id,
    tokenId: tokenRecord.id,
    role: "user",
  });

  // 4. Update stored hash to match the final token (which embeds the tokenId)
  const finalHash = await bcrypt.hash(
    refreshToken,
    parseInt(env.BCRYPT_ROUNDS),
  );
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: { token: finalHash },
  });

  const { password: _, ...safeUser } = user;

  return {
    user: safeUser as SafeUser,
    tokens: { accessToken, refreshToken },
  };
};

export const refreshUserTokens = async (
  rawRefreshToken: string,
): Promise<AuthTokens> => {
  const payload = verifyRefreshToken(rawRefreshToken);
  if (payload.role !== "user") throw new ApiError(401, "Invalid token type");

  const record = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
  });

  if (!record || record.expiresAt < new Date()) {
    throw new ApiError(401, "Session expired — please log in again");
  }

  const match = await bcrypt.compare(rawRefreshToken, record.token);
  if (!match)
    throw new ApiError(401, "Token mismatch — possible replay attack");

  // Rotate: delete old, issue new
  await prisma.refreshToken.delete({ where: { id: record.id } });

  const user = await prisma.user.findUnique({ where: { id: payload.id } });
  if (!user || !user.isActive) throw new ApiError(401, "Account not found");

  const accessToken = signAccess({
    id: user.id,
    email: user.email,
    role: "user",
  });

  const newRecord = await prisma.refreshToken.create({
    data: {
      token: await bcrypt.hash("placeholder", parseInt(env.BCRYPT_ROUNDS)),
      userId: user.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  const refreshToken = signRefresh({
    id: user.id,
    tokenId: newRecord.id,
    role: "user",
  });
  await prisma.refreshToken.update({
    where: { id: newRecord.id },
    data: {
      token: await bcrypt.hash(refreshToken, parseInt(env.BCRYPT_ROUNDS)),
    },
  });

  return { accessToken, refreshToken };
};

export const logoutUser = async (tokenId: string): Promise<void> => {
  try {
    await prisma.refreshToken.delete({ where: { id: tokenId } });
  } catch {
    // Already deleted or never existed — not an error
  }
};

// ── Seller Auth ───────────────────────────────────────────────────────────────

export const registerSeller = async (
  data: RegisterSellerInput,
): Promise<SafeSeller> => {
  const emailTaken = await prisma.seller.findUnique({
    where: { email: data.email },
  });
  if (emailTaken) throw new ApiError(409, "Email is already registered");

  const hashed = await bcrypt.hash(data.password, parseInt(env.BCRYPT_ROUNDS));

  const seller = await prisma.seller.create({
    data: {
      email: data.email,
      password: hashed,
      businessName: data.businessName,
      ownerName: data.ownerName,
      phone: data.phone,
      category: data.category as any,
      city: data.city ?? null,
      address: data.address ?? null,
    },
    select: {
      id: true,
      email: true,
      businessName: true,
      ownerName: true,
      logo: true,
      phone: true,
      category: true,
      city: true,
      isVerified: true,
      rating: true,
      totalSales: true,
      createdAt: true,
    },
  });

  return seller as SafeSeller;
};

export const loginSeller = async (
  data: LoginInput,
): Promise<SellerAuthResult> => {
  const seller = await prisma.seller.findUnique({
    where: { email: data.email },
  });
  if (!seller) throw new ApiError(401, "Invalid email or password");

  const valid = await bcrypt.compare(data.password, seller.password);
  if (!valid) throw new ApiError(401, "Invalid email or password");

  if (!seller.isActive)
    throw new ApiError(403, "Your account has been deactivated");

  const accessToken = signAccess({
    id: seller.id,
    email: seller.email,
    role: "seller",
  });

  const tokenRecord = await prisma.refreshToken.create({
    data: {
      token: await bcrypt.hash("placeholder", parseInt(env.BCRYPT_ROUNDS)),
      sellerId: seller.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  const refreshToken = signRefresh({
    id: seller.id,
    tokenId: tokenRecord.id,
    role: "seller",
  });
  await prisma.refreshToken.update({
    where: { id: tokenRecord.id },
    data: {
      token: await bcrypt.hash(refreshToken, parseInt(env.BCRYPT_ROUNDS)),
    },
  });

  const { password: _, ...safeSeller } = seller;

  return {
    seller: safeSeller as SafeSeller,
    tokens: { accessToken, refreshToken },
  };
};

export const refreshSellerTokens = async (
  rawRefreshToken: string,
): Promise<AuthTokens> => {
  const payload = verifyRefreshToken(rawRefreshToken);
  if (payload.role !== "seller") throw new ApiError(401, "Invalid token type");

  const record = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
  });
  if (!record || record.expiresAt < new Date()) {
    throw new ApiError(401, "Session expired — please log in again");
  }

  const match = await bcrypt.compare(rawRefreshToken, record.token);
  if (!match) throw new ApiError(401, "Token mismatch");

  await prisma.refreshToken.delete({ where: { id: record.id } });

  const seller = await prisma.seller.findUnique({ where: { id: payload.id } });
  if (!seller || !seller.isActive) throw new ApiError(401, "Account not found");

  const accessToken = signAccess({
    id: seller.id,
    email: seller.email,
    role: "seller",
  });

  const newRecord = await prisma.refreshToken.create({
    data: {
      token: await bcrypt.hash("placeholder", parseInt(env.BCRYPT_ROUNDS)),
      sellerId: seller.id,
      expiresAt: refreshTokenExpiry(),
    },
  });

  const refreshToken = signRefresh({
    id: seller.id,
    tokenId: newRecord.id,
    role: "seller",
  });
  await prisma.refreshToken.update({
    where: { id: newRecord.id },
    data: {
      token: await bcrypt.hash(refreshToken, parseInt(env.BCRYPT_ROUNDS)),
    },
  });

  return { accessToken, refreshToken };
};

export const logoutSeller = async (tokenId: string): Promise<void> => {
  try {
    await prisma.refreshToken.delete({ where: { id: tokenId } });
  } catch {
    // Silently ignore
  }
};
