// src/controllers/match.controller.ts

import { Response } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { getDrivingDistances } from "../services/maps.service";
import { calculateCarbonSaved } from "../utils/carbon";
import { AuthenticatedRequest, WasteWithDistance } from "../types";
import { MatchStatus, WasteStatus } from "@prisma/client";

// ─── Validation ──────────────────────────────────────────────────────────────
const recommendQuerySchema = z.object({
  radiusKm: z.coerce.number().min(1).max(200).default(50),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
});

const confirmMatchSchema = z.object({
  wasteId: z.string().uuid(),
});

// ─── Match Score Algorithm ────────────────────────────────────────────────────
/**
 * Weighted scoring for ranking recommendations:
 *   40% — driving distance (closer = better)
 *   30% — weight/quantity  (higher = better)
 *   20% — carbon saving    (higher = better)
 *   10% — freshness        (newer post = better)
 */
function calculateMatchScore(
  distanceKm: number,
  weightKg: number,
  carbonSavedKg: number,
  createdAt: Date,
  radiusKm: number
): number {
  const distScore = Math.max(0, 1 - distanceKm / radiusKm);
  const weightScore = Math.min(1, weightKg / 500);
  const carbonScore = Math.min(1, carbonSavedKg / 200);
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const freshnessScore = Math.max(0, 1 - ageDays / 30);

  const weighted =
    distScore * 0.4 +
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
export async function getRecommendations(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    if (!req.user.lat || !req.user.lng) {
      res.status(400).json({
        success: false,
        message:
          "Your account has no location coordinates. Please update your profile with a valid address.",
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
    const availableWastes = await prisma.waste.findMany({
      where: {
        status: WasteStatus.AVAILABLE,
        ...(category ? { category: category.toUpperCase() as any } : {}),
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
    const geocodedWastes = availableWastes.filter(
      (w) => w.generator.lat !== null && w.generator.lng !== null
    );

    // 4. Bulk call Google Distance Matrix API (or Haversine fallback)
    const destinations = geocodedWastes.map((w) => ({
      id: w.id,
      lat: w.generator.lat as number,
      lng: w.generator.lng as number,
    }));

    const distanceMap = await getDrivingDistances(
      req.user.lat,
      req.user.lng,
      destinations
    );

    // 5. Enrich, filter by radius, sort, and score
    const enriched: WasteWithDistance[] = geocodedWastes
      .map((w) => {
        const dist = distanceMap.get(w.id);
        if (!dist) return null;

        const estimatedCO2 = calculateCarbonSaved(
          w.category,
          w.weightKg,
          dist.distanceKm
        );

        const score = calculateMatchScore(
          dist.distanceKm,
          w.weightKg,
          estimatedCO2,
          w.createdAt,
          radiusKm
        );

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
        } as WasteWithDistance;
      })
      .filter((w): w is WasteWithDistance => w !== null)
      .filter((w) => w.distanceKm <= radiusKm)
      .sort((a, b) => b.matchScore - a.matchScore)   // Best match first
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
  } catch (error) {
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
export async function createMatch(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
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
    const waste = await prisma.waste.findUnique({
      where: { id: wasteId },
      include: { generator: { select: { id: true, lat: true, lng: true } } },
    });

    if (!waste) {
      res.status(404).json({ success: false, message: "Waste not found" });
      return;
    }

    if (waste.status !== WasteStatus.AVAILABLE) {
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
      const distMap = await getDrivingDistances(req.user.lat, req.user.lng, [
        { id: wasteId, lat: waste.generator.lat, lng: waste.generator.lng },
      ]);
      const dist = distMap.get(wasteId);
      if (dist) {
        distanceKm = dist.distanceKm;
        durationMins = dist.durationMins;
      }
    }

    // 3. Calculate carbon saved
    const carbonSavedKg = calculateCarbonSaved(waste.category, waste.weightKg, distanceKm);

    // 4. Create match + update waste status atomically
    const [match] = await prisma.$transaction([
      prisma.match.create({
        data: {
          wasteId,
          receiverId: req.user.id,
          actualDistanceKm: distanceKm,
          drivingTimeMins: durationMins,
          carbonSavedKg,
          matchStatus: MatchStatus.PENDING_APPROVAL,
        },
        include: {
          waste: { select: { title: true, category: true, weightKg: true } },
          receiver: { select: { companyName: true } },
        },
      }),
      prisma.waste.update({
        where: { id: wasteId },
        data: { status: WasteStatus.MATCHED },
      }),
    ]);

    res.status(201).json({
      success: true,
      message: "Match created successfully",
      data: match,
    });
  } catch (error) {
    console.error("[Match] Create error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}

/**
 * PATCH /api/matches/:matchId/status
 * Protected
 * Body: { status: "ACCEPTED" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED" }
 */
export async function updateMatchStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Not authenticated" });
      return;
    }

    const { matchId } = req.params;
    const { status } = req.body as { status: MatchStatus };

    const validStatuses: MatchStatus[] = [
      MatchStatus.ACCEPTED,
      MatchStatus.IN_TRANSIT,
      MatchStatus.COMPLETED,
      MatchStatus.CANCELLED,
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ success: false, message: "Invalid status" });
      return;
    }

    const match = await prisma.match.findUnique({
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
    const updateData: any = { matchStatus: status };
    if (status === MatchStatus.COMPLETED) {
      await prisma.waste.update({
        where: { id: match.wasteId },
        data: { status: WasteStatus.COLLECTED },
      });
    }
    if (status === MatchStatus.CANCELLED) {
      await prisma.waste.update({
        where: { id: match.wasteId },
        data: { status: WasteStatus.AVAILABLE },
      });
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: updateData,
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    console.error("[Match] Update status error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
}
