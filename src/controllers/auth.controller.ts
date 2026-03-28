// src/controllers/auth.controller.ts

import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { prisma } from "../utils/prisma";

// ─── Validation Schemas ───────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  companyName: z.string().min(2, "Company name is required"),
  role: z.enum(["GENERATOR", "RECEIVER"]).default("GENERATOR"),
  addressText: z.string().optional(),
  // Coordinates: either provide directly OR derive from addressText via Google Geocoding
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function signToken(userId: string): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not configured");
  return jwt.sign({ userId }, secret, {
    expiresIn: (process.env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"]) ?? "7d",
  });
}

/**
 * Geocode an address using Google Geocoding API.
 * Falls back to null/null if the API key is not set (dev mode).
 */
async function geocodeAddress(
  address: string
): Promise<{ lat: number | null; lng: number | null }> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.warn("[Geocoding] GOOGLE_MAPS_API_KEY not set — skipping geocoding");
    return { lat: null, lng: null };
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;

  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results: { geometry: { location: { lat: number; lng: number } } }[];
  };

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
export async function register(req: Request, res: Response): Promise<void> {
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

    const { email, password, companyName, role, addressText, lat, lng } =
      parsed.data;

    // 2. Check duplicate email
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, message: "Email already in use" });
      return;
    }

    // 3. Hash password (cost factor 12 = production-safe)
    const passwordHash = await bcrypt.hash(password, 12);

    // 4. Resolve coordinates
    let resolvedLat = lat ?? null;
    let resolvedLng = lng ?? null;

    if ((!resolvedLat || !resolvedLng) && addressText) {
      const coords = await geocodeAddress(addressText);
      resolvedLat = coords.lat;
      resolvedLng = coords.lng;
    }

    // 5. Create user
    const user = await prisma.user.create({
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
  } catch (error) {
    console.error("[Auth] Register error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export async function login(req: Request, res: Response): Promise<void> {
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
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Timing-safe: always compare to prevent user enumeration
      await bcrypt.compare(password, "$2a$12$dummyhashtopreventtimingattacks00000000000000000000000");
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // 3. Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
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
  } catch (error) {
    console.error("[Auth] Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/**
 * GET /api/auth/me  (protected)
 * Returns the currently authenticated user's profile
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    // req.user is populated by authMiddleware
    const authReq = req as import("../types").AuthenticatedRequest;
    if (!authReq.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const user = await prisma.user.findUnique({
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
  } catch (error) {
    console.error("[Auth] GetMe error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
