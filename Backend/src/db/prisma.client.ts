import { PrismaClient } from "@prisma/client";
import pkg from 'pg';
const { Pool } = pkg;
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({
  connectionString,
  max: Number.parseInt(process.env.PG_POOL_MAX ?? "10", 10) || 10,
  connectionTimeoutMillis: Number.parseInt(process.env.PG_CONNECT_TIMEOUT_MS ?? "20000", 10) || 20_000,
  idleTimeoutMillis: 30_000,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
