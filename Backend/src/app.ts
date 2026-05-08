import express, { type Application } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server } from "socket.io";
import { env } from "./config/env.js";
import { errorMiddleware } from "./shared/middleware/error.middleware.js";
import authRouter from "./modules/auth/auth.routes.js";

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

    this.app.use("/api/v1/auth", authRouter);

    // Global error handler — must be LAST
    this.app.use(errorMiddleware);
  }

  private setSocketEvents(): void {
    this.io.on("connection", (socket) => {
      console.log(`🔌 Socket connected: ${socket.id}`);
      socket.on("disconnect", () => {
        console.log(`🔌 Socket disconnected: ${socket.id}`);
      });
    });
  }
}

export default new App();
