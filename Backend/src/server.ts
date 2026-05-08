import app from "./app.js";
import { prisma } from "./db/prisma.client.js";
import mongoose from "mongoose";
import { env } from "./config/env.js";

async function bootstrap() {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log("🍃 MongoDB connected");

    await prisma.$connect();
    console.log("🗄️  PostgreSQL connected via Prisma");

    app.httpServer.listen(env.PORT, () => {
      console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

bootstrap();
