import app from "./app.js";
import { prisma } from "./db/prisma.client.js";
import { env } from "./config/env.js";

async function bootstrap() {
  try {

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
