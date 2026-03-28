"use strict";
// src/controllers/auth.controller.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
exports.getMe = getMe;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
// ─── Validation Schemas ───────────────────────────────────────────────────────
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(8, "Password must be at least 8 characters"),
    companyName: zod_1.z.string().min(2, "Company name is required"),
    role: zod_1.z.enum(["GENERATOR", "RECEIVER"]).default("GENERATOR"),
    addressText: zod_1.z.string().optional(),
    // Coordinates: either provide directly OR derive from addressText via Google Geocoding
    lat: zod_1.z.number().min(-90).max(90).optional(),
    lng: zod_1.z.number().min(-180).max(180).optional(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
// ─── Helpers ─────────────────────────────────────────────────────────────────
function signToken(userId) {
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error("JWT_SECRET not configured");
    return jsonwebtoken_1.default.sign({ userId }, secret, {
        expiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
    });
}
/**
 * Geocode an address using Google Geocoding API.
 * Falls back to null/null if the API key is not set (dev mode).
 */
async function geocodeAddress(address) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
        console.warn("[Geocoding] GOOGLE_MAPS_API_KEY not set — skipping geocoding");
        return { lat: null, lng: null };
    }
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`;
    const res = await fetch(url);
    const data = (await res.json());
    if (data.status !== "OK" || !data.results[0]) {
        console.warn("[Geocoding] Could not geocode address:", address);
        return { lat: null, lng: null };
    }
    return data.results[0].geometry.location;
}
// ─── Controllers ─────────────────────────────────────────────────────────────
/**
 * POST /api/auth/register
 * Body: { email, password, companyName, role, addressText?, lat?, lng? }
 */
async function register(req, res) {
    try {
        // 1. Validate input
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const { email, password, companyName, role, addressText, lat, lng } = parsed.data;
        // 2. Check duplicate email
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ success: false, message: "Email already in use" });
            return;
        }
        // 3. Hash password (cost factor 12 = production-safe)
        const passwordHash = await bcryptjs_1.default.hash(password, 12);
        // 4. Resolve coordinates
        let resolvedLat = lat ?? null;
        let resolvedLng = lng ?? null;
        if ((!resolvedLat || !resolvedLng) && addressText) {
            const coords = await geocodeAddress(addressText);
            resolvedLat = coords.lat;
            resolvedLng = coords.lng;
        }
        // 5. Create user
        const user = await prisma_1.prisma.user.create({
            data: {
                email,
                passwordHash,
                companyName,
                role,
                addressText: addressText ?? null,
                lat: resolvedLat,
                lng: resolvedLng,
            },
            select: {
                id: true,
                email: true,
                companyName: true,
                role: true,
                lat: true,
                lng: true,
                createdAt: true,
            },
        });
        // 6. Issue token
        const token = signToken(user.id);
        res.status(201).json({
            success: true,
            message: "Registration successful",
            data: { user, token },
        });
    }
    catch (error) {
        console.error("[Auth] Register error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
/**
 * POST /api/auth/login
 * Body: { email, password }
 */
async function login(req, res) {
    try {
        // 1. Validate input
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                message: "Validation error",
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const { email, password } = parsed.data;
        // 2. Find user
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            // Timing-safe: always compare to prevent user enumeration
            await bcryptjs_1.default.compare(password, "$2a$12$dummyhashtopreventtimingattacks00000000000000000000000");
            res.status(401).json({ success: false, message: "Invalid credentials" });
            return;
        }
        // 3. Verify password
        const passwordMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!passwordMatch) {
            res.status(401).json({ success: false, message: "Invalid credentials" });
            return;
        }
        // 4. Issue token
        const token = signToken(user.id);
        res.json({
            success: true,
            message: "Login successful",
            data: {
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    companyName: user.companyName,
                    role: user.role,
                    lat: user.lat,
                    lng: user.lng,
                },
            },
        });
    }
    catch (error) {
        console.error("[Auth] Login error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
/**
 * GET /api/auth/me  (protected)
 * Returns the currently authenticated user's profile
 */
async function getMe(req, res) {
    try {
        // req.user is populated by authMiddleware
        const authReq = req;
        if (!authReq.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: authReq.user.id },
            select: {
                id: true,
                email: true,
                companyName: true,
                role: true,
                addressText: true,
                lat: true,
                lng: true,
                createdAt: true,
                _count: { select: { wastes: true, matchesReceived: true } },
            },
        });
        res.json({ success: true, data: user });
    }
    catch (error) {
        console.error("[Auth] GetMe error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//# sourceMappingURL=auth.controller.js.map