"use strict";
// src/controllers/match.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = getRecommendations;
exports.createMatch = createMatch;
exports.updateMatchStatus = updateMatchStatus;
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const maps_service_1 = require("../services/maps.service");
const carbon_1 = require("../utils/carbon");
const client_1 = require("@prisma/client");
// ─── Validation ──────────────────────────────────────────────────────────────
const recommendQuerySchema = zod_1.z.object({
    radiusKm: zod_1.z.coerce.number().min(1).max(200).default(50),
    category: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().min(1).max(50).default(20),
});
const confirmMatchSchema = zod_1.z.object({
    wasteId: zod_1.z.string().uuid(),
});
// ─── Match Score Algorithm ────────────────────────────────────────────────────
/**
 * Weighted scoring for ranking recommendations:
 *   40% — driving distance (closer = better)
 *   30% — weight/quantity  (higher = better)
 *   20% — carbon saving    (higher = better)
 *   10% — freshness        (newer post = better)
 */
function calculateMatchScore(distanceKm, weightKg, carbonSavedKg, createdAt, radiusKm) {
    const distScore = Math.max(0, 1 - distanceKm / radiusKm);
    const weightScore = Math.min(1, weightKg / 500);
    const carbonScore = Math.min(1, carbonSavedKg / 200);
    const ageMs = Date.now() - createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const freshnessScore = Math.max(0, 1 - ageDays / 30);
    const weighted = distScore * 0.4 +
        weightScore * 0.3 +
        carbonScore * 0.2 +
        freshnessScore * 0.1;
    return Math.round(weighted * 100);
}
// ─── Controllers ─────────────────────────────────────────────────────────────
/**
 * GET /api/matches/recommendations
 * Protected — RECEIVER role
 *
 * Returns available wastes sorted by driving distance from the receiver's location,
 * enriched with estimated carbon saving and match score.
 */
async function getRecommendations(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        if (!req.user.lat || !req.user.lng) {
            res.status(400).json({
                success: false,
                message: "Your account has no location coordinates. Please update your profile with a valid address.",
            });
            return;
        }
        // 1. Parse & validate query params
        const parsed = recommendQuerySchema.safeParse(req.query);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                errors: parsed.error.flatten().fieldErrors,
            });
            return;
        }
        const { radiusKm, category, limit } = parsed.data;
        // 2. Fetch all AVAILABLE wastes (with generator coordinates)
        const availableWastes = await prisma_1.prisma.waste.findMany({
            where: {
                status: client_1.WasteStatus.AVAILABLE,
                ...(category ? { category: category.toUpperCase() } : {}),
                // Exclude own wastes
                generator: { id: { not: req.user.id } },
            },
            include: {
                generator: {
                    select: {
                        id: true,
                        companyName: true,
                        lat: true,
                        lng: true,
                        addressText: true,
                    },
                },
            },
            take: 100, // Cap DB query; filter by radius afterwards
        });
        if (!availableWastes.length) {
            res.json({ success: true, data: [], total: 0 });
            return;
        }
        // 3. Filter to wastes where generator has coordinates
        const geocodedWastes = availableWastes.filter((w) => w.generator.lat !== null && w.generator.lng !== null);
        // 4. Bulk call Google Distance Matrix API (or Haversine fallback)
        const destinations = geocodedWastes.map((w) => ({
            id: w.id,
            lat: w.generator.lat,
            lng: w.generator.lng,
        }));
        const distanceMap = await (0, maps_service_1.getDrivingDistances)(req.user.lat, req.user.lng, destinations);
        // 5. Enrich, filter by radius, sort, and score
        const enriched = geocodedWastes
            .map((w) => {
            const dist = distanceMap.get(w.id);
            if (!dist)
                return null;
            const estimatedCO2 = (0, carbon_1.calculateCarbonSaved)(w.category, w.weightKg, dist.distanceKm);
            const score = calculateMatchScore(dist.distanceKm, w.weightKg, estimatedCO2, w.createdAt, radiusKm);
            return {
                id: w.id,
                title: w.title,
                category: w.category,
                weightKg: w.weightKg,
                status: w.status,
                pickupInstructions: w.pickupInstructions,
                generator: {
                    companyName: w.generator.companyName,
                    lat: w.generator.lat,
                    lng: w.generator.lng,
                },
                distanceKm: dist.distanceKm,
                durationMins: dist.durationMins,
                estimatedCarbonSavedKg: estimatedCO2,
                matchScore: score,
            };
        })
            .filter((w) => w !== null)
            .filter((w) => w.distanceKm <= radiusKm)
            .sort((a, b) => b.matchScore - a.matchScore) // Best match first
            .slice(0, limit);
        res.json({
            success: true,
            data: enriched,
            total: enriched.length,
            meta: {
                receiverLocation: { lat: req.user.lat, lng: req.user.lng },
                radiusKm,
                algorithm: "Google Distance Matrix + Weighted Score (dist:40% qty:30% co2:20% fresh:10%)",
            },
        });
    }
    catch (error) {
        console.error("[Match] Recommendations error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
/**
 * POST /api/matches
 * Protected — RECEIVER role
 * Body: { wasteId }
 *
 * Creates a match, updates waste status, calculates & stores carbon saved.
 */
async function createMatch(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const parsed = confirmMatchSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, errors: parsed.error.flatten().fieldErrors });
            return;
        }
        const { wasteId } = parsed.data;
        // 1. Fetch waste + generator location
        const waste = await prisma_1.prisma.waste.findUnique({
            where: { id: wasteId },
            include: { generator: { select: { id: true, lat: true, lng: true } } },
        });
        if (!waste) {
            res.status(404).json({ success: false, message: "Waste not found" });
            return;
        }
        if (waste.status !== client_1.WasteStatus.AVAILABLE) {
            res.status(409).json({ success: false, message: "Waste is no longer available" });
            return;
        }
        if (waste.generatorId === req.user.id) {
            res.status(400).json({ success: false, message: "Cannot match your own waste" });
            return;
        }
        // 2. Calculate actual distance
        let distanceKm = 0;
        let durationMins = 0;
        if (req.user.lat && req.user.lng && waste.generator.lat && waste.generator.lng) {
            const distMap = await (0, maps_service_1.getDrivingDistances)(req.user.lat, req.user.lng, [
                { id: wasteId, lat: waste.generator.lat, lng: waste.generator.lng },
            ]);
            const dist = distMap.get(wasteId);
            if (dist) {
                distanceKm = dist.distanceKm;
                durationMins = dist.durationMins;
            }
        }
        // 3. Calculate carbon saved
        const carbonSavedKg = (0, carbon_1.calculateCarbonSaved)(waste.category, waste.weightKg, distanceKm);
        // 4. Create match + update waste status atomically
        const [match] = await prisma_1.prisma.$transaction([
            prisma_1.prisma.match.create({
                data: {
                    wasteId,
                    receiverId: req.user.id,
                    actualDistanceKm: distanceKm,
                    drivingTimeMins: durationMins,
                    carbonSavedKg,
                    matchStatus: client_1.MatchStatus.PENDING_APPROVAL,
                },
                include: {
                    waste: { select: { title: true, category: true, weightKg: true } },
                    receiver: { select: { companyName: true } },
                },
            }),
            prisma_1.prisma.waste.update({
                where: { id: wasteId },
                data: { status: client_1.WasteStatus.MATCHED },
            }),
        ]);
        res.status(201).json({
            success: true,
            message: "Match created successfully",
            data: match,
        });
    }
    catch (error) {
        console.error("[Match] Create error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
/**
 * PATCH /api/matches/:matchId/status
 * Protected
 * Body: { status: "ACCEPTED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" }
 */
async function updateMatchStatus(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const { matchId } = req.params;
        const { status } = req.body;
        const validStatuses = [
            client_1.MatchStatus.ACCEPTED,
            client_1.MatchStatus.IN_TRANSIT,
            client_1.MatchStatus.COMPLETED,
            client_1.MatchStatus.CANCELLED,
        ];
        if (!validStatuses.includes(status)) {
            res.status(400).json({ success: false, message: "Invalid status" });
            return;
        }
        const match = await prisma_1.prisma.match.findUnique({
            where: { id: matchId },
            include: { waste: true },
        });
        if (!match) {
            res.status(404).json({ success: false, message: "Match not found" });
            return;
        }
        // Only receiver or generator can update
        if (match.receiverId !== req.user.id && match.waste.generatorId !== req.user.id) {
            res.status(403).json({ success: false, message: "Not authorized to update this match" });
            return;
        }
        // If completing the match, mark waste as COLLECTED
        const updateData = { matchStatus: status };
        if (status === client_1.MatchStatus.COMPLETED) {
            await prisma_1.prisma.waste.update({
                where: { id: match.wasteId },
                data: { status: client_1.WasteStatus.COLLECTED },
            });
        }
        if (status === client_1.MatchStatus.CANCELLED) {
            await prisma_1.prisma.waste.update({
                where: { id: match.wasteId },
                data: { status: client_1.WasteStatus.AVAILABLE },
            });
        }
        const updated = await prisma_1.prisma.match.update({
            where: { id: matchId },
            data: updateData,
        });
        res.json({ success: true, data: updated });
    }
    catch (error) {
        console.error("[Match] Update status error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//# sourceMappingURL=match.controller.js.map