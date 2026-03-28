import { Response } from "express";
import { AuthenticatedRequest } from "../types";
/**
 * GET /api/reports/esg/download
 * Protected — any authenticated user
 * Query params: year? (defaults to current year)
 *
 * 1. Aggregates all COMPLETED matches for the user
 * 2. Builds ESGReportData payload
 * 3. Renders to PDF via Puppeteer
 * 4. Returns with Content-Disposition: attachment → browser saves the file
 */
export declare function downloadESGReport(req: AuthenticatedRequest, res: Response): Promise<void>;
/**
 * GET /api/reports/esg/preview
 * Protected
 * Returns JSON summary (for Dashboard display — no PDF generation overhead)
 */
export declare function previewESGStats(req: AuthenticatedRequest, res: Response): Promise<void>;
//# sourceMappingURL=report.controller.d.ts.map