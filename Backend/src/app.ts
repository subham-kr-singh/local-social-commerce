import express, { Application } from "express";
import cors from "cors";
import { createServer, Server as HTTPServer } from "http";
import { Server } from "socket.io";

class App {
  public app: Application;
  public httpServer: HTTPServer;
  public io: Server;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);

    // Initialize Socket.io
    this.io = new Server(this.httpServer, {
      cors: {
        origin: "*", // Adjust for production
        methods: ["GET", "POST"],
      },
    });

    this.setMiddlewares();
    this.setRoutes();
    this.setSocketEvents();
  }

  private setMiddlewares(): void {
    this.app.use(cors());
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
  }

  private setRoutes(): void {
    this.app.get("/", (req, res) => {
      res.status(200).json({ message: "Server is healthy" });
    });
    // Future: this.app.use('/api/v1/users', userRouter);
  }

  private setSocketEvents(): void {
    this.io.on("connection", (socket) => {
      console.log(`🔌 New Socket connection: ${socket.id}`);
    });
  }
}

export default new App();
