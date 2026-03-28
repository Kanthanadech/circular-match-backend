"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wasteRouter = void 0;
// src/routes/waste.routes.ts
const express_1 = require("express");
const waste_controller_1 = require("../controllers/waste.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
exports.wasteRouter = (0, express_1.Router)();
// Public
exports.wasteRouter.get("/", waste_controller_1.listWastes);
exports.wasteRouter.get("/:id", waste_controller_1.getWaste);
// Protected — GENERATOR only
exports.wasteRouter.post("/", auth_middleware_1.authMiddleware, (0, auth_middleware_1.requireRole)("GENERATOR", "ADMIN"), waste_controller_1.createWaste);
//# sourceMappingURL=waste.routes.js.map