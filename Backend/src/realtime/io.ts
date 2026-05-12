import type { Server } from "socket.io";

const globalForIo = globalThis as unknown as { io?: Server };

export function setIo(io: Server): void {
  globalForIo.io = io;
}

export function getIo(): Server | undefined {
  return globalForIo.io;
}

