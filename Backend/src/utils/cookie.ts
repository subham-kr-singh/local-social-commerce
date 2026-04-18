import { Response } from "express";
import { CookieOptions } from "express";

class CookieService {
  private readonly options: CookieOptions;

  constructor() {
    this.options = {
      httpOnly: true,
      secure:   process.env.NODE_ENV === "production",
      sameSite: "strict",
      path:     "/",
    };
  }

  setRefreshToken(res: Response, token: string): void {
    res.cookie("refreshToken", token, {
      ...this.options,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    });
  }

  clearRefreshToken(res: Response): void {
    res.clearCookie("refreshToken", this.options);
  }
}

export const cookieService = new CookieService();