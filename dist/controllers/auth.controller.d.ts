import { Request, Response } from "express";
/**
 * POST /api/auth/register
 * Body: { email, password, companyName, role, addressText?, lat?, lng? }
 */
export declare function register(req: Request, res: Response): Promise<void>;
/**
 * POST /api/auth/login
 * Body: { email, password }
 */
export declare function login(req: Request, res: Response): Promise<void>;
/**
 * GET /api/auth/me  (protected)
 * Returns the currently authenticated user's profile
 */
export declare function getMe(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map