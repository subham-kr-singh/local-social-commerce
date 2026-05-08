export const COOKIE_NAME = {
  REFRESH_TOKEN: "refreshToken",
} as const;

export const REFRESH_TOKEN_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

export const ROLES = {
  USER: "user",
  SELLER: "seller",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const SELLER_CATEGORIES = [
  "FASHION",
  "ELECTRONICS",
  "FOOD_BEVERAGE",
  "HOME_DECOR",
  "BEAUTY_WELLNESS",
  "SPORTS_FITNESS",
  "BOOKS_STATIONERY",
  "TOYS_KIDS",
  "JEWELLERY",
  "OTHER",
] as const;

export type SellerCategory = (typeof SELLER_CATEGORIES)[number];
