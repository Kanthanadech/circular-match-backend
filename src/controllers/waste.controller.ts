// src/controllers/waste.controller.ts

import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { AuthenticatedRequest } from "../types";
import { WasteCategory, WasteStatus } from "@prisma/client";

const createWasteSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.nativeEnum(WasteCategory),
  weightKg: z.number().positive(),
  imageUrl: z.string().url().optional(),
  pickupInstructions: z.string().optional(),
});

/**
 * POST /api/wastes
 * Protected — GENERATOR role
 */
export async function createWaste(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) { res.status(401).json({ success: false }); return; }

    const parsed = createWasteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
      return;
    }

    const waste = await prisma.waste.create({
      data: { ...parsed.data, generatorId: req.user.id },
      include: { generator: { select: { companyName: true, lat: true, lng: true } } },
    });

    res.status(201).json({ success: true, data: waste });
  } catch (error) {
    console.error("[Waste] Create error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/**
 * GET /api/wastes
 * Public — list available wastes with optional filters
 */
export async function listWastes(req: Request, res: Response): Promise<void> {
  try {
    const { category, status = "AVAILABLE", page = "1", limit = "20" } = req.query;

    const wastes = await prisma.waste.findMany({
      where: {
        status: (status as WasteStatus) ?? WasteStatus.AVAILABLE,
        ...(category ? { category: category as WasteCategory } : {}),
      },
      include: {
        generator: { select: { companyName: true, lat: true, lng: true, addressText: true } },
      },
      skip: (parseInt(page as string) - 1) * parseInt(limit as string),
      take: parseInt(limit as string),
      orderBy: { createdAt: "desc" },
    });

    const total = await prisma.waste.count({
      where: { status: (status as WasteStatus) ?? WasteStatus.AVAILABLE },
    });

    res.json({ success: true, data: wastes, total, page: parseInt(page as string) });
  } catch (error) {
    console.error("[Waste] List error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/**
 * GET /api/wastes/:id
 */
export async function getWaste(req: Request, res: Response): Promise<void> {
  try {
    const waste = await prisma.waste.findUnique({
      where: { id: req.params.id },
      include: { generator: { select: { companyName: true, addressText: true } } },
    });
    if (!waste) { res.status(404).json({ success: false, message: "Not found" }); return; }
    res.json({ success: true, data: waste });
  } catch (error) {
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
