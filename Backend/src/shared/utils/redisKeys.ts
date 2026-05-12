export const redisKeys = {
  sellerFollowerCount: (sellerId: string) =>
    `seller:${sellerId}:followerCount`,
  sellerProfile: (sellerId: string) => `seller:${sellerId}:profile`,
  feedPage: (userId: string, page: number) =>
    `feed:${userId}:page:${page}`,
} as const;
