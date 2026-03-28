"use strict";
// src/controllers/report.controller.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadESGReport = downloadESGReport;
exports.previewESGStats = previewESGStats;
const prisma_1 = require("../utils/prisma");
const report_service_1 = require("../services/report.service");
const carbon_1 = require("../utils/carbon");
const client_1 = require("@prisma/client");
/**
 * GET /api/reports/esg/download
 * Protected — any authenticated user
 * Query params: year? (defaults to current year)
 *
 * 1. Aggregates all COMPLETED matches for the user
 * 2. Builds ESGReportData payload
 * 3. Renders to PDF via Puppeteer
 * 4. Returns with Content-Disposition: attachment → browser saves the file
 */
async function downloadESGReport(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const year = parseInt(req.query.year ?? String(new Date().getFullYear()), 10);
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        // ── 1. Query completed matches for this user ─────────────────────────────
        const completedMatches = await prisma_1.prisma.match.findMany({
            where: {
                matchStatus: client_1.MatchStatus.COMPLETED,
                OR: [
                    // User is the receiver (they diverted waste)
                    { receiverId: req.user.id },
                    // User is the generator (their waste was recycled)
                    { waste: { generatorId: req.user.id } },
                ],
                updatedAt: { gte: startDate, lt: endDate },
            },
            include: {
                waste: {
                    select: {
                        title: true,
                        category: true,
                        weightKg: true,
                    },
                },
            },
            orderBy: { updatedAt: "asc" },
        });
        // ── 2. Aggregate metrics ─────────────────────────────────────────────────
        const totalCarbonSavedKg = completedMatches.reduce((sum, m) => sum + m.carbonSavedKg, 0);
        const totalWasteRecycledKg = completedMatches.reduce((sum, m) => sum + m.waste.weightKg, 0);
        // ── 3. Build report data ─────────────────────────────────────────────────
        const reportData = {
            company: {
                name: req.user.companyName,
                address: "Thailand",
            },
            period: `ปี ${year} (1 ม.ค. – 31 ธ.ค. ${year})`,
            metrics: {
                totalCarbonSavedKg: parseFloat(totalCarbonSavedKg.toFixed(3)),
                totalWasteRecycledKg: parseFloat(totalWasteRecycledKg.toFixed(1)),
                matchesCompleted: completedMatches.length,
                carbonCreditValueThb: (0, carbon_1.carbonToCreditValue)(totalCarbonSavedKg),
            },
            matchLog: completedMatches.map((m) => ({
                date: m.updatedAt.toLocaleDateString("th-TH", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                }),
                wasteTitle: m.waste.title,
                category: m.waste.category,
                weightKg: m.waste.weightKg,
                distanceKm: m.actualDistanceKm ?? 0,
                carbonSavedKg: m.carbonSavedKg,
            })),
            generatedAt: new Date().toLocaleString("th-TH", {
                dateStyle: "long",
                timeStyle: "medium",
            }),
        };
        // ── 4. Generate PDF ──────────────────────────────────────────────────────
        const pdfBuffer = await (0, report_service_1.generateESGPdf)(reportData);
        // ── 5. Send with download headers ────────────────────────────────────────
        const filename = `ESG_Carbon_Report_${req.user.companyName.replace(/\s+/g, "_")}_${year}.pdf`;
        res.set({
            "Content-Type": "application/pdf",
            // 'attachment' triggers browser Save-As dialog
            "Content-Disposition": `attachment; filename="${filename}"`,
            "Content-Length": pdfBuffer.length,
            "Cache-Control": "no-cache",
        });
        res.end(pdfBuffer, "binary");
    }
    catch (error) {
        console.error("[Report] ESG PDF generation error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to generate report",
            error: process.env.NODE_ENV === "development" ? String(error) : undefined,
        });
    }
}
/**
 * GET /api/reports/esg/preview
 * Protected
 * Returns JSON summary (for Dashboard display — no PDF generation overhead)
 */
async function previewESGStats(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, message: "Not authenticated" });
            return;
        }
        const year = parseInt(req.query.year ?? String(new Date().getFullYear()), 10);
        const startDate = new Date(`${year}-01-01T00:00:00.000Z`);
        const endDate = new Date(`${year + 1}-01-01T00:00:00.000Z`);
        const [completed, pending, byCategoryRaw] = await Promise.all([
            // Total completed
            prisma_1.prisma.match.aggregate({
                where: {
                    matchStatus: client_1.MatchStatus.COMPLETED,
                    OR: [{ receiverId: req.user.id }, { waste: { generatorId: req.user.id } }],
                    updatedAt: { gte: startDate, lt: endDate },
                },
                _sum: { carbonSavedKg: true },
                _count: { id: true },
            }),
            // Pending
            prisma_1.prisma.match.count({
                where: {
                    matchStatus: { in: [client_1.MatchStatus.PENDING_APPROVAL, client_1.MatchStatus.ACCEPTED, client_1.MatchStatus.IN_TRANSIT] },
                    OR: [{ receiverId: req.user.id }, { waste: { generatorId: req.user.id } }],
                },
            }),
            // By category breakdown
            prisma_1.prisma.match.findMany({
                where: {
                    matchStatus: client_1.MatchStatus.COMPLETED,
                    OR: [{ receiverId: req.user.id }, { waste: { generatorId: req.user.id } }],
                    updatedAt: { gte: startDate, lt: endDate },
                },
                include: { waste: { select: { category: true, weightKg: true } } },
            }),
        ]);
        const byCategory = {};
        for (const m of byCategoryRaw) {
            const cat = m.waste.category;
            if (!byCategory[cat])
                byCategory[cat] = { count: 0, weightKg: 0, carbonKg: 0 };
            byCategory[cat].count++;
            byCategory[cat].weightKg += m.waste.weightKg;
            byCategory[cat].carbonKg += m.carbonSavedKg;
        }
        const totalCarbon = completed._sum.carbonSavedKg ?? 0;
        res.json({
            success: true,
            data: {
                year,
                total_waste_recycled_kg: byCategoryRaw.reduce((s, m) => s + m.waste.weightKg, 0),
                total_carbon_saved_kg: parseFloat(totalCarbon.toFixed(3)),
                matches_completed: completed._count.id,
                matches_pending: pending,
                carbon_credit_value_thb: (0, carbon_1.carbonToCreditValue)(totalCarbon),
                by_category: byCategory,
            },
        });
    }
    catch (error) {
        console.error("[Report] Preview error:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
}
//# sourceMappingURL=report.controller.js.map