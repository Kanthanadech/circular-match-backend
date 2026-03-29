"use strict";
// src/index.ts
// Entry point — Express app setup, middleware, routes, error handling
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = require("./routes/auth.routes");
const waste_routes_1 = require("./routes/waste.routes");
const match_routes_1 = require("./routes/match.routes");
const report_routes_1 = require("./routes/report.routes");
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const prisma_1 = require("./utils/prisma");
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const app = (0, express_1.default)();
const PORT = process.env.PORT ?? 3000;
// ─── Global Middleware ────────────────────────────────────────────────────────
app.use((0, cors_1.default)({
    origin: process.env.NODE_ENV === "production"
        ? ["https://yourdomain.com", "http://localhost:3000", "http://localhost:3001", "http://localhost:5500", "http://127.0.0.1:3001", "http://127.0.0.1:5500"]
        : "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
// ─── Request Logger (dev) ─────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
        next();
    });
}
// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", async (_req, res) => {
    try {
        await prisma_1.prisma.$queryRaw `SELECT 1`;
        res.json({
            status: "ok",
            service: "circular-match-api",
            db: "connected",
            timestamp: new Date().toISOString(),
        });
    }
    catch {
        res.status(503).json({ status: "error", db: "disconnected" });
    }
});
// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth", auth_routes_1.authRouter);
app.use("/api/wastes", waste_routes_1.wasteRouter);
app.use("/api/matches", match_routes_1.matchRouter);
app.use("/api/export", export_routes_1.default);
app.use("/api/reports", report_routes_1.reportRouter);
app.use('/api/dashboard', dashboard_1.default);
// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: "Route not found",
        hint: "Check /health for available endpoints",
    });
});
// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
    console.error("[Unhandled Error]", err);
    res.status(500).json({
        success: false,
        message: "Internal server error",
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
});
// ─── Start Server ─────────────────────────────────────────────────────────────
async function main() {
    try {
        await prisma_1.prisma.$connect();
        console.log("✅  Database connected");
        app.listen(PORT, () => {
            console.log(`🚀  Circular Match API running on http://localhost:${PORT}`);
            console.log(`📋  Health: http://localhost:${PORT}/health`);
            console.log(`🔑  Auth:   POST /api/auth/register | POST /api/auth/login`);
            console.log(`🗂   Wastes: GET/POST /api/wastes`);
            console.log(`🔗  Match:  GET /api/matches/recommendations`);
            console.log(`📄  Report: GET /api/reports/esg/download`);
        });
    }
    catch (err) {
        console.error("❌  Failed to start server:", err);
        await prisma_1.prisma.$disconnect();
        process.exit(1);
    }
}
// Graceful shutdown
process.on("SIGTERM", async () => {
    console.log("SIGTERM received — shutting down gracefully");
    await prisma_1.prisma.$disconnect();
    process.exit(0);
});
main();
//# sourceMappingURL=index.js.map