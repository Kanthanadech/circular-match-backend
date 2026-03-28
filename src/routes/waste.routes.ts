// src/routes/waste.routes.ts
import { Router } from "express";
import { createWaste, listWastes, getWaste } from "../controllers/waste.controller";
import { authMiddleware, requireRole } from "../middleware/auth.middleware";

export const wasteRouter = Router();

// Public
wasteRouter.get("/", listWastes);
wasteRouter.get("/:id", getWaste);

// Protected — GENERATOR only
wasteRouter.post("/", authMiddleware, requireRole("GENERATOR", "ADMIN"), createWaste);
