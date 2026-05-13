import app from "./app.js";
import { prisma } from "./db/prisma.client.js";
import { env } from "./config/env.js";

async function bootstrap() {
  try {

    await prisma.$connect();
    console.log("🗄️  PostgreSQL connected via Prisma");

    app.httpServer.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${env.PORT} is already in use. Stop the other process or set PORT in .env.`);
      } else {
        console.error("❌ HTTP server error:", err);
      }
      void prisma.$disconnect().finally(() => process.exit(1));
    });

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
