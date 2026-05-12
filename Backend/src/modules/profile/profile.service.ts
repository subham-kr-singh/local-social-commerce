import { prisma } from "../../db/prisma.client.js";
import { ApiError } from "../../shared/utils/ApiError.js";
import { redisDel } from "../../shared/utils/redisCache.js";
import { redisKeys } from "../../shared/utils/redisKeys.js";
import type { SafeSeller, SafeUser } from "../auth/auth.types.js";

function toSafeUser(u: {
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
}): SafeUser {
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    fullName: u.fullName,
    avatar: u.avatar,
    phone: u.phone,
    city: u.city,
    latitude: u.latitude,
    longitude: u.longitude,
    isVerified: u.isVerified,
    createdAt: u.createdAt,
  };
}

function toSafeSeller(s: {
  id: string;
  email: string;
  businessName: string;
  ownerName: string;
  logo: string | null;
  phone: string | null;
  category: string;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  isVerified: boolean;
  rating: number;
  totalSales: number;
  createdAt: Date;
}): SafeSeller {
  return {
    id: s.id,
    email: s.email,
    businessName: s.businessName,
    ownerName: s.ownerName,
    logo: s.logo,
    phone: s.phone ?? "",
    category: s.category,
    city: s.city,
    latitude: s.latitude,
    longitude: s.longitude,
    isVerified: s.isVerified,
    rating: s.rating,
    totalSales: s.totalSales,
    createdAt: s.createdAt,
  };
}

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      avatar: true,
      bio: true,
      phone: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { orders: true, follows: true } },
    },
  });
  if (!user) throw new ApiError(404, "User not found");

  const { _count, ...rest } = user;
  return {
    user: rest,
    orderCount: _count.orders,
    followingCount: _count.follows,
  };
}

export async function updateUserProfile(
  userId: string,
  patch: {
    fullName?: string | undefined;
    bio?: string | undefined;
    phone?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    avatar?: string | undefined;
  },
) {
  const data: Record<string, unknown> = {};
  if (patch.fullName !== undefined) data.fullName = patch.fullName;
  if (patch.bio !== undefined) data.bio = patch.bio;
  if (patch.phone !== undefined) data.phone = patch.phone;
  if (patch.city !== undefined) data.city = patch.city;
  if (patch.state !== undefined) data.state = patch.state;
  if (patch.latitude !== undefined) data.latitude = patch.latitude;
  if (patch.longitude !== undefined) data.longitude = patch.longitude;
  if (patch.avatar !== undefined) data.avatar = patch.avatar;

  if (Object.keys(data).length === 0) {
    const existing = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatar: true,
        phone: true,
        city: true,
        latitude: true,
        longitude: true,
        isVerified: true,
        createdAt: true,
      },
    });
    if (!existing) throw new ApiError(404, "User not found");
    return toSafeUser(existing);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      username: true,
      fullName: true,
      avatar: true,
      phone: true,
      city: true,
      latitude: true,
      longitude: true,
      isVerified: true,
      createdAt: true,
    },
  });

  return toSafeUser(updated);
}

export async function getSellerProfile(sellerId: string) {
  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
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
      address: true,
      city: true,
      state: true,
      latitude: true,
      longitude: true,
      isVerified: true,
      isActive: true,
      rating: true,
      totalSales: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { products: true, orders: true, followers: true },
      },
    },
  });
  if (!seller) throw new ApiError(404, "Seller not found");

  const { _count, ...rest } = seller;
  return {
    seller: rest,
    stats: {
      products: _count.products,
      orders: _count.orders,
      followers: _count.followers,
    },
  };
}

export async function updateSellerProfile(
  sellerId: string,
  patch: {
    businessName?: string | undefined;
    ownerName?: string | undefined;
    bio?: string | undefined;
    phone?: string | undefined;
    city?: string | undefined;
    state?: string | undefined;
    address?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    logo?: string | undefined;
    coverImage?: string | undefined;
  },
) {
  const data: Record<string, unknown> = {};
  if (patch.businessName !== undefined) data.businessName = patch.businessName;
  if (patch.ownerName !== undefined) data.ownerName = patch.ownerName;
  if (patch.bio !== undefined) data.bio = patch.bio;
  if (patch.phone !== undefined) data.phone = patch.phone;
  if (patch.city !== undefined) data.city = patch.city;
  if (patch.state !== undefined) data.state = patch.state;
  if (patch.address !== undefined) data.address = patch.address;
  if (patch.latitude !== undefined) data.latitude = patch.latitude;
  if (patch.longitude !== undefined) data.longitude = patch.longitude;
  if (patch.logo !== undefined) data.logo = patch.logo;
  if (patch.coverImage !== undefined) data.coverImage = patch.coverImage;

  if (Object.keys(data).length === 0) {
    const existing = await prisma.seller.findUnique({
      where: { id: sellerId },
      select: {
        id: true,
        email: true,
        businessName: true,
        ownerName: true,
        logo: true,
        phone: true,
        category: true,
        city: true,
        latitude: true,
        longitude: true,
        isVerified: true,
        rating: true,
        totalSales: true,
        createdAt: true,
      },
    });
    if (!existing) throw new ApiError(404, "Seller not found");
    return toSafeSeller(existing);
  }

  const updated = await prisma.seller.update({
    where: { id: sellerId },
    data,
    select: {
      id: true,
      email: true,
      businessName: true,
      ownerName: true,
      logo: true,
      phone: true,
      category: true,
      city: true,
      latitude: true,
      longitude: true,
      isVerified: true,
      rating: true,
      totalSales: true,
      createdAt: true,
    },
  });

  await redisDel(redisKeys.sellerProfile(sellerId));

  return toSafeSeller(updated);
}
