// src/routes/match.routes.ts
import { Router } from "express";
import {
  getRecommendations,
  createMatch,
  updateMatchStatus,
} from "../controllers/match.controller";
import { authMiddleware, requireRole } from "../middleware/auth.middleware";

export const matchRouter = Router();

// All match routes require authentication
matchRouter.use(authMiddleware);

// GET /api/matches/recommendations?radiusKm=50&category=ORGANIC
matchRouter.get(
  "/recommendations",
  requireRole("RECEIVER", "ADMIN"),
  getRecommendations
);

// POST /api/matches  — confirm a match
matchRouter.post("/", requireRole("RECEIVER", "ADMIN"), createMatch);

// PATCH /api/matches/:matchId/status
matchRouter.patch("/:matchId/status", updateMatchStatus);
