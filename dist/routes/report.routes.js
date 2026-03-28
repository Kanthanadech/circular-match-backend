"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportRouter = void 0;
// src/routes/report.routes.ts
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.reportRouter = (0, express_1.Router)();
exports.reportRouter.use(auth_middleware_1.authMiddleware);
// GET /api/reports/esg/preview?year=2025   → JSON stats for dashboard
exports.reportRouter.get("/esg/preview", report_controller_1.previewESGStats);
// GET /api/reports/esg/download?year=2025  → PDF download (The Killer Feature)
exports.reportRouter.get("/esg/download", report_controller_1.downloadESGReport);
//# sourceMappingURL=report.routes.js.map