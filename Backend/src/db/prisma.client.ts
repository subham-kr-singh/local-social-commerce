import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import pkg from "pg";
const { Pool } = pkg;

function isNeonDatabaseUrl(url: string): boolean {
  return /\.neon\.tech\b/i.test(url) || /\bneon\.tech\b/i.test(url);
}

function createAdapterFactory() {
  const connectionString = process.env.DATABASE_URL ?? "";

  if (isNeonDatabaseUrl(connectionString)) {
    return new PrismaNeon(
      { connectionString },
      {
        onPoolError: (err: Error) => {
          console.error("[prisma/neon] Pool error:", err.message);
        },
      },
    );
  }

  const pool = new Pool({
    connectionString,
    max: Number.parseInt(process.env.PG_POOL_MAX ?? "10", 10) || 10,
    connectionTimeoutMillis: Number.parseInt(process.env.PG_CONNECT_TIMEOUT_MS ?? "20000", 10) || 20_000,
    idleTimeoutMillis: 30_000,
  });
  pool.on("error", (err: Error) => {
    console.error("[prisma/pg] Pool error:", err.message);
  });
  return new PrismaPg(pool, {
    onPoolError: (err: Error) => {
      console.error("[prisma/pg] Pool error:", err.message);
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: createAdapterFactory(),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
