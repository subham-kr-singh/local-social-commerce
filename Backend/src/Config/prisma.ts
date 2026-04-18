
import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { PrismaClient } = pkg;

// 1. Setup the PostgreSQL Connection Pool
// Using the URL from your .env file
const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });

// 2. Initialize the Prisma Adapter for PostgreSQL
const adapter = new PrismaPg(pool);

// 3. Prevent multiple instances of Prisma Client in development (Singleton Pattern)
// This is crucial for nodemon/tsx to avoid "Too many connections" errors
const globalForPrisma = global as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter, // Directs Prisma to use the pg pool above
    log: ['query', 'info', 'warn', 'error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;