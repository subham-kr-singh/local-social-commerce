import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  NODE_ENV:             z.enum(["development", "production", "test"]).default("development"),
  PORT:                 z.string().default("5000"),
  DATABASE_URL:         z.string().min(1, "DATABASE_URL is required"),
  JWT_ACCESS_SECRET:    z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET:   z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_EXPIRY:    z.string().default("15m"),
  JWT_REFRESH_EXPIRY:   z.string().default("7d"),
  BCRYPT_ROUNDS:        z.string().default("12"),
  CORS_ORIGIN:          z.string().default("http://localhost:3000"),

  REDIS_URL:            z.string().optional(),
  AGORA_APP_ID:         z.string().optional(),
  AGORA_APP_CERTIFICATE: z.string().optional(),
  IMAGEKIT_PUBLIC_KEY:  z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
