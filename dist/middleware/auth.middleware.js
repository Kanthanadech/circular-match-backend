"use strict";
// src/middleware/auth.middleware.ts
// Protects routes — verifies JWT from Authorization: Bearer <token>
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
exports.requireRole = requireRole;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../utils/prisma");
async function authMiddleware(req, res, next) {
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
        if (!secret)
            throw new Error("JWT_SECRET is not configured");
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // 3. Load user from DB (ensures token belongs to an existing, active user)
        const user = await prisma_1.prisma.user.findUnique({
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
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            res.status(401).json({ success: false, message: "Invalid token" });
            return;
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            res.status(401).json({ success: false, message: "Token expired" });
            return;
        }
        next(error);
    }
}
// Role-based access control helper
function requireRole(...roles) {
    return (req, res, next) => {
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
//# sourceMappingURL=auth.middleware.js.map