import { Response } from "express";
import { AuthenticatedRequest } from "../types";
export declare function getMessages(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function sendMessage(req: AuthenticatedRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=chat.controller.d.ts.map