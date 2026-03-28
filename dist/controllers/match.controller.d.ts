import { Response } from "express";
import { AuthenticatedRequest } from "../types";
/**
 * GET /api/matches/recommendations
 * Protected — RECEIVER role
 *
 * Returns available wastes sorted by driving distance from the receiver's location,
 * enriched with estimated carbon saving and match score.
 */
export declare function getRecommendations(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * POST /api/matches
 * Protected — RECEIVER role
 * Body: { wasteId }
 *
 * Creates a match, updates waste status, calculates & stores carbon saved.
 */
export declare function createMatch(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * PATCH /api/matches/:matchId/status
 * Protected
 * Body: { status: "ACCEPTED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" }
 */
export declare function updateMatchStatus(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=match.controller.d.ts.map