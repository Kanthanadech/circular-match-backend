"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchRouter = void 0;
// src/routes/match.routes.ts
const express_1 = require("express");
const match_controller_1 = require("../controllers/match.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.matchRouter = (0, express_1.Router)();
// All match routes require authentication
exports.matchRouter.use(auth_middleware_1.authMiddleware);
// GET /api/matches/recommendations?radiusKm=50&category=ORGANIC
exports.matchRouter.get("/recommendations", (0, auth_middleware_1.requireRole)("RECEIVER", "ADMIN"), match_controller_1.getRecommendations);
// POST /api/matches  — confirm a match
exports.matchRouter.post("/", (0, auth_middleware_1.requireRole)("RECEIVER", "ADMIN"), match_controller_1.createMatch);
// PATCH /api/matches/:matchId/status
exports.matchRouter.patch("/:matchId/status", match_controller_1.updateMatchStatus);
//# sourceMappingURL=match.routes.js.map