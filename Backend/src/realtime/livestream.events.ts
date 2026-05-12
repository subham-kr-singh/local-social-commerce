import { getIo } from "./io.js";

export type StreamStartedPayload = {
  streamId: string;
  sellerId: string;
  title: string;
};

export type StreamEndedPayload = {
  streamId: string;
  sellerId: string;
};

export type ProductPinnedPayload = {
  streamId: string;
  product: unknown;
  isPinned: boolean;
  displayOrder: number;
};

export type ProductUnpinnedPayload = {
  streamId: string;
  productId: string;
};

export function emitStreamStarted(payload: StreamStartedPayload): void {
  const io = getIo();
  if (!io) return;
  io.to(`stream:${payload.streamId}`).emit("stream-started", payload);
}

export function emitStreamEnded(payload: StreamEndedPayload): void {
  const io = getIo();
  if (!io) return;
  io.to(`stream:${payload.streamId}`).emit("stream-ended", payload);
}

export function emitProductPinned(payload: ProductPinnedPayload): void {
  const io = getIo();
  if (!io) return;
  io.to(`stream:${payload.streamId}`).emit("product-pinned", payload);
}

export function emitProductUnpinned(payload: ProductUnpinnedPayload): void {
  const io = getIo();
  if (!io) return;
  io.to(`stream:${payload.streamId}`).emit("product-unpinned", payload);
}

