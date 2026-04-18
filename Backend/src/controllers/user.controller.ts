import { Request, Response } from "express";
import { prisma } from "../Config/prisma.js";

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // Prisma provides full autocompletion for your models
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};
