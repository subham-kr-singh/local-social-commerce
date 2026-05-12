import express, { type Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.config.js";
import { env } from "./config/env.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";
import v1Router from "./routes/v1.routes.js";
import { attachSocketIoRedisAdapter } from "./realtime/socket.setup.js";
import { setIo } from "./realtime/io.js";

class App {
  public app: Application;
  public httpServer: ReturnType<typeof createServer>;
  public io: Server;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.io = new Server(this.httpServer, {
      cors: { origin: env.CORS_ORIGIN, methods: ["GET", "POST"] },
    });
    attachSocketIoRedisAdapter(this.io);
    setIo(this.io);

    this.setMiddlewares();
    this.setRoutes();
    this.setSocketEvents();
  }

  private setMiddlewares(): void {
    this.app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());
  }

  private setRoutes(): void {
    this.app.get("/", (_req, res) => {
      res.status(200).json({ message: "Server is healthy" });
    });

    // ── API Docs ─────────────────────────────────────────────────────────────
    this.app.use(
      "/api/docs",
      swaggerUi.serve,
      swaggerUi.setup(swaggerSpec, {
        customSiteTitle: "Social Commerce API",
        customCss: `
          .topbar { display: none }
          .swagger-ui .info { margin: 20px 0 }
        `,
        swaggerOptions: {
          persistAuthorization: true,          // keeps Bearer token across page refresh
          displayRequestDuration: true,        // shows response time in ms
          filter: true,                        // search bar across endpoints
          defaultModelsExpandDepth: 2,
          defaultModelExpandDepth: 2,
        },
      }),
    );

    // Expose raw OpenAPI JSON for tools like Postman / Insomnia
    this.app.get("/api/docs.json", (_req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.send(swaggerSpec);
    });

    // ── API Routes ────────────────────────────────────────────────────────────
    this.app.use("/api/v1", v1Router);

    // ── Global Error Handler (must stay last) ─────────────────────────────────
    this.app.use(errorMiddleware);
  }

  private setSocketEvents(): void {
    this.io.on("connection", (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);

      // Clients can join a personal room for targeted events.
      socket.on("join", (payload: unknown) => {
        if (
          payload &&
          typeof payload === "object" &&
          "userId" in payload &&
          typeof (payload as { userId: unknown }).userId === "string"
        ) {
          const userId = (payload as { userId: string }).userId;
          socket.join(`user:${userId}`);
        }
      });

      socket.on("disconnect", () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
      });
    });
  }
}

export default new App();
