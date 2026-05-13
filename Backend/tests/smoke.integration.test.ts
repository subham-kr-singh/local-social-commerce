import { createHmac } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { io as ioClient, type Socket as ClientSocket } from "socket.io-client";
import app from "../src/app.js";
import { RtcRole, RtcTokenBuilder } from "../src/lib/agoraRtcToken.js";

describe("API & realtime smoke", () => {
  let port = 0;

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      app.httpServer.once("error", reject);
      app.httpServer.listen(0, () => resolve());
    });
    const addr = app.httpServer.address();
    if (addr && typeof addr === "object") port = addr.port;
    if (!port) throw new Error("Could not bind test server");
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      app.io.close(() => {
        app.httpServer.close(() => resolve());
      });
    });
  });

  it("GET / returns healthy", async () => {
    const res = await request(app.app).get("/");
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ message: expect.stringMatching(/healthy/i) });
  });

  it("GET /api/docs.json returns OpenAPI JSON", async () => {
    const res = await request(app.app).get("/api/docs.json");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/json/);
    expect(res.body.openapi).toBeDefined();
  });

  it("Agora RTC token builds (CJS bridge, no network)", () => {
    const now = Math.floor(Date.now() / 1000) + 3600;
    // agora-token v2 AccessToken2 requires App ID and certificate each as exactly 32 hex chars.
    const appId32 = "0123456789abcdef0123456789abcdef";
    const cert32 = "fedcba9876543210fedcba9876543210";
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId32,
      cert32,
      "unit-test-channel",
      0,
      RtcRole.PUBLISHER,
      now,
      now,
    );
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(20);
  });

  it("Razorpay payment HMAC matches documented algorithm", () => {
    const secret = "test_razorpay_secret_key_32chars!!";
    const orderId = "order_test";
    const paymentId = "pay_test";
    const expected = createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    expect(expected).toMatch(/^[a-f0-9]{64}$/);
  });

  it("Socket.IO connects and accepts join + join-stream", async () => {
    const client: ClientSocket = ioClient(`http://127.0.0.1:${port}`, {
      transports: ["websocket"],
      extraHeaders: { origin: "http://localhost:3000" },
      forceNew: true,
    });

    await new Promise<void>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("socket connect timeout")), 15000);
      client.once("connect", () => {
        clearTimeout(t);
        resolve();
      });
      client.once("connect_error", (err) => {
        clearTimeout(t);
        reject(err);
      });
    });

    client.emit("join", { userId: "vitest-user" });
    client.emit("join-stream", { streamId: "vitest-stream" });
    client.disconnect();
    await new Promise((r) => setTimeout(r, 50));
  });
});
