// src/middleware/auth.middleware.ts
// Protects routes — verifies JWT from Authorization: Bearer <token>

import { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../utils/prisma";
import { AuthenticatedRequest } from "../types";

interface JwtPayload {
  userId: string;
  iat: number;
  exp: number;
}

export async function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // 1. Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        message: "Unauthorized — missing or malformed token",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    // 2. Verify signature & expiry
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not configured");

    const decoded = jwt.verify(token, secret) as JwtPayload;

    // 3. Load user from DB (ensures token belongs to an existing, active user)
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        companyName: true,
        lat: true,
        lng: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Unauthorized — user not found",
      });
      return;
    }

    // 4. Attach user to request object for downstream controllers
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, message: "Invalid token" });
      return;
    }
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: "Token expired" });
      return;
    }
    next(error);
  }
}

// Role-based access control helper
export function requireRole(...roles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden — requires role: ${roles.join(" or ")}`,
      });
      return;
    }
    next();
  };
}
