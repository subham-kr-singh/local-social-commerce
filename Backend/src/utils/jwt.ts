import jwt from "jsonwebtoken";
import { JwtPayload, RefreshTokenPayload } from "../types/index.js";

class JwtService {
  private readonly accessSecret:  string;
  private readonly refreshSecret: string;
  private readonly accessExpiry:  string;
  private readonly refreshExpiry: string;

  private readonly baseOptions: jwt.SignOptions = {
    issuer:   "social-commerce-auth",
    audience: "social-commerce-app",
  };

  constructor() {
    this.accessSecret  = process.env.JWT_ACCESS_SECRET  ?? "";
    this.refreshSecret = process.env.JWT_REFRESH_SECRET ?? "";
    this.accessExpiry  = process.env.JWT_ACCESS_EXPIRY  ?? "15m";
    this.refreshExpiry = process.env.JWT_REFRESH_EXPIRY ?? "7d";

    if (!this.accessSecret || !this.refreshSecret) {
      throw new Error("JWT secrets must be defined in environment variables");
    }
  }

  generateAccessToken(payload: JwtPayload): string {
    return jwt.sign(payload, this.accessSecret, {
      ...this.baseOptions,
      expiresIn: this.accessExpiry,
    });
  }

  generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, this.refreshSecret, {
      ...this.baseOptions,
      expiresIn: this.refreshExpiry,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, this.accessSecret, this.baseOptions) as JwtPayload;
  }

  verifyRefreshToken(token: string): RefreshTokenPayload {
    return jwt.verify(token, this.refreshSecret, this.baseOptions) as RefreshTokenPayload;
  }

  decodeToken(token: string): jwt.JwtPayload | null {
    return jwt.decode(token) as jwt.JwtPayload | null;
  }

  getRefreshTokenExpiry(): Date {
    const days = parseInt(this.refreshExpiry) || 7;
    const d    = new Date();
    d.setDate(d.getDate() + days);
    return d;
  }
}

export const jwtService = new JwtService();