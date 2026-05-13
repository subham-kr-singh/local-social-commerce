import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import "./config/env.js";
import app from "./app.js";
import { prisma } from "./db/prisma.client.js";
import { env } from "./config/env.js";

const HOST = "0.0.0.0";
const port = Number.parseInt(String(env.PORT), 10);

function gracefulShutdown(signal: string): void {
  console.log(`[shutdown] ${signal} — closing HTTP & Prisma…`);
  app.io.disconnectSockets(true);
  app.httpServer.close(() => {
    void prisma.$disconnect().finally(() => {
      console.log("[shutdown] complete");
      process.exit(0);
    });
  });
  setTimeout(() => {
    console.error("[shutdown] timeout, forcing exit");
    process.exit(1);
  }, 12_000).unref();
}

process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.once("SIGINT", () => gracefulShutdown("SIGINT"));

async function bootstrap() {
  try {
    if (!Number.isFinite(port) || port < 1 || port > 65_535) {
      throw new Error(`Invalid PORT: ${String(env.PORT)}`);
    }

    await prisma.$connect();
    console.log("🗄️  PostgreSQL connected via Prisma");

    app.httpServer.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        console.error(`❌ Port ${port} is already in use. Stop the other process or set PORT in .env.`);
      } else {
        console.error("❌ HTTP server error:", err);
      }
      void prisma.$disconnect().finally(() => process.exit(1));
    });

    app.httpServer.listen(port, HOST, () => {
      console.log(`🚀 Server listening on http://${HOST}:${port} [${env.NODE_ENV}]`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

void bootstrap();
