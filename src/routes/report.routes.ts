// src/routes/report.routes.ts
import { Router } from "express";
import { downloadESGReport, previewESGStats } from "../controllers/report.controller";
import { authMiddleware } from "../middleware/auth.middleware";

export const reportRouter = Router();

reportRouter.use(authMiddleware);

// GET /api/reports/esg/preview?year=2025   → JSON stats for dashboard
reportRouter.get("/esg/preview", previewESGStats);

// GET /api/reports/esg/download?year=2025  → PDF download (The Killer Feature)
reportRouter.get("/esg/download", downloadESGReport);
