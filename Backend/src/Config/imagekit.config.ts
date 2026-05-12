import ImageKit from "@imagekit/nodejs";
import { env } from "./env.js";

export const imagekitPublicConfig = {
  publicKey: env.IMAGEKIT_PUBLIC_KEY ?? "",
  urlEndpoint: env.IMAGEKIT_URL_ENDPOINT ?? "",
} as const;

export function getImageKitClient(): ImageKit {
  if (!env.IMAGEKIT_PRIVATE_KEY) {
    throw new Error(
      "ImageKit is not configured. Set IMAGEKIT_PRIVATE_KEY in environment variables.",
    );
  }

  return new ImageKit({
    privateKey: env.IMAGEKIT_PRIVATE_KEY,
  });
}
