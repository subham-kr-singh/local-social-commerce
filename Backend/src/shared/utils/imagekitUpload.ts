import { toFile } from "@imagekit/nodejs";
import { getImageKitClient } from "../../config/imagekit.config.js";

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
