import { Request, Response } from "express";
import { AuthenticatedRequest } from "../types";
/**
 * POST /api/wastes
 * Protected — GENERATOR role
 */
export declare function createWaste(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * GET /api/wastes
 * Public — list available wastes with optional filters
 */
export declare function listWastes(req: Request, res: Response): Promise<void>;
/**
 * GET /api/wastes/:id
 */
export declare function getWaste(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=waste.controller.d.ts.map