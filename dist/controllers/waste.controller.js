"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listWastes = listWastes;
exports.createWaste = createWaste;
exports.getWaste = getWaste;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
/**
 * GET /api/wastes
 */
async function listWastes(req, res) {
    try {
        const { status, category, limit } = req.query;
        const where = {};
        if (status)
            where.status = String(status).toUpperCase();
        if (category)
            where.category = String(category).toUpperCase();
        const wastes = await prisma.waste.findMany({
            where,
            take: limit ? parseInt(String(limit)) : 100,
            orderBy: { createdAt: "desc" },
            include: {
                generator: {
                    select: { id: true, companyName: true, lat: true, lng: true, email: true },
                },
            },
        });
        const results = wastes.map((w) => ({
            id: w.id,
            generator_id: w.generatorId,
            title: w.title,
            category: w.category.toLowerCase().charAt(0).toUpperCase() + w.category.toLowerCase().slice(1),
            weight_kg: w.weightKg,
            frequency: "weekly",
            status: w.status.toLowerCase(),
            description: w.description,
            generator: {
                id: w.generator?.id,
                company: w.generator?.companyName,
                lat: w.generator?.lat,
                lng: w.generator?.lng,
            },
        }));
        res.json({ success: true, count: results.length, results });
    }
    catch (error) {
        console.error("[Waste] getWastes error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
/**
 * POST /api/wastes
 */
async function createWaste(req, res) {
    try {
        const authReq = req;
        const generatorId = authReq.user?.id || req.body.generator_id;
        if (!generatorId) {
            res.status(401).json({ success: false, message: "Authentication required" });
            return;
        }
        const { title, category, weight_kg, description, lat, lng } = req.body;
        if (!title || !category || !weight_kg) {
            res.status(400).json({ success: false, message: "Missing required fields" });
            return;
        }
        const waste = await prisma.waste.create({
            data: {
                title,
                category: String(category).toUpperCase(),
                weightKg: parseFloat(weight_kg),
                description: description || "",
                generatorId,
                status: "AVAILABLE",
            },
        });
        res.status(201).json({
            success: true,
            id: waste.id,
            title: waste.title,
            status: "available",
            created_at: waste.createdAt,
        });
    }
    catch (error) {
        console.error("[Waste] createWaste error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
/**
 * GET /api/wastes/:id
 */
async function getWaste(req, res) {
    try {
        const waste = await prisma.waste.findUnique({
            where: { id: req.params.id },
            include: { generator: { select: { companyName: true, addressText: true, lat: true, lng: true } } },
        });
        if (!waste) {
            res.status(404).json({ success: false, message: "Not found" });
            return;
        }
        res.json({ success: true, data: waste });
    }
    catch (error) {
        console.error("[Waste] getWaste error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//# sourceMappingURL=waste.controller.js.map