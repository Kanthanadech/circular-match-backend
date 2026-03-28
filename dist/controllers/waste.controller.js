"use strict";
// src/controllers/waste.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.createWaste = createWaste;
exports.listWastes = listWastes;
exports.getWaste = getWaste;
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const client_1 = require("@prisma/client");
const createWasteSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().optional(),
    category: zod_1.z.nativeEnum(client_1.WasteCategory),
    weightKg: zod_1.z.number().positive(),
    imageUrl: zod_1.z.string().url().optional(),
    pickupInstructions: zod_1.z.string().optional(),
});
/**
 * POST /api/wastes
 * Protected — GENERATOR role
 */
async function createWaste(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false });
            return;
        }
        const parsed = createWasteSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const waste = await prisma_1.prisma.waste.create({
            data: { ...parsed.data, generatorId: req.user.id },
            include: { generator: { select: { companyName: true, lat: true, lng: true } } },
        });
        res.status(201).json({ success: true, data: waste });
    }
    catch (error) {
        console.error("[Waste] Create error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
/**
 * GET /api/wastes
 * Public — list available wastes with optional filters
 */
async function listWastes(req, res) {
    try {
        const { category, status = "AVAILABLE", page = "1", limit = "20" } = req.query;
        const wastes = await prisma_1.prisma.waste.findMany({
            where: {
                status: status ?? client_1.WasteStatus.AVAILABLE,
                ...(category ? { category: category } : {}),
            },
            include: {
                generator: { select: { companyName: true, lat: true, lng: true, addressText: true } },
            },
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit),
            orderBy: { createdAt: "desc" },
        });
        const total = await prisma_1.prisma.waste.count({
            where: { status: status ?? client_1.WasteStatus.AVAILABLE },
        });
        res.json({ success: true, data: wastes, total, page: parseInt(page) });
    }
    catch (error) {
        console.error("[Waste] List error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
/**
 * GET /api/wastes/:id
 */
async function getWaste(req, res) {
    try {
        const waste = await prisma_1.prisma.waste.findUnique({
            where: { id: req.params.id },
            include: { generator: { select: { companyName: true, addressText: true } } },
        });
        if (!waste) {
            res.status(404).json({ success: false, message: "Not found" });
            return;
        }
        res.json({ success: true, data: waste });
    }
    catch (error) {
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//# sourceMappingURL=waste.controller.js.map