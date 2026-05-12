import { toFile } from "@imagekit/nodejs";
import { env } from "../../config/env.js";
import { getImageKitClient } from "../../config/imagekit.config.js";
import { ApiError } from "./ApiError.js";

type UploadToImageKitInput = {
  fileBuffer: Buffer;
  fileName: string;
  folder?: string;
  tags?: string[];
};

export async function uploadBufferToImageKit({
  fileBuffer,
  fileName,
  folder,
  tags,
}: UploadToImageKitInput) {
  const imagekit = getImageKitClient();

  return imagekit.files.upload({
    file: await toFile(fileBuffer, fileName),
    fileName,
    ...(folder ? { folder } : {}),
    ...(tags?.length ? { tags } : {}),
    useUniqueFileName: true,
  });
}

/** Public CDN URL for a stored ImageKit asset. */
export function resolveUploadedFileUrl(upload: {
  url?: string;
  filePath?: string;
}): string {
  if (upload.url) return upload.url;
  const fp = upload.filePath;
  const base = env.IMAGEKIT_URL_ENDPOINT?.replace(/\/$/, "");
  if (fp && base) {
    const path = fp.startsWith("/") ? fp : `/${fp}`;
    return `${base}${path}`;
  }
  throw new ApiError(500, "Image upload did not return a usable URL");
}
