import { Request, Response } from "express";
export declare function register(req: Request, res: Response): Promise<void>;
export declare function login(req: Request, res: Response): Promise<void>;
export declare function getMe(req: Request, res: Response): Promise<void>;
export declare function sendMatchEmail(toEmail: string, toCompany: string, wasteTitle: string, co2: number, dist: number): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map