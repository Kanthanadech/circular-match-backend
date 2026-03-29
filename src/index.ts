// src/index.ts
// Entry point — Express app setup, middleware, routes, error handling

import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { authRouter } from "./routes/auth.routes";
import { wasteRouter } from "./routes/waste.routes";
import { matchRouter } from "./routes/match.routes";
import { reportRouter } from "./routes/report.routes";
import exportRouter from "./routes/export.routes";
import { prisma } from "./utils/prisma";
import dashboardRouter from './routes/dashboard';

const app = express();
const PORT = process.env.PORT ?? 3000;

// ─── Global Middleware ────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? ["https://yourdomain.com", "http://localhost:3000", "http://localhost:3001", "http://localhost:5500", "http://127.0.0.1:3001", "http://127.0.0.1:5500"]
    : "*",
  methods: ["GET", "POST", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Request Logger (dev) ─────────────────────────────────────────────────────
if (process.env.NODE_ENV === "development") {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "ok",
      service: "circular-match-api",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api/auth",    authRouter);
app.use("/api/wastes",  wasteRouter);
app.use("/api/matches", matchRouter);
app.use("/api/export",  exportRouter);
app.use("/api/reports", reportRouter);
app.use('/api/dashboard', dashboardRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
    hint: "Check /health for available endpoints",
  });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
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
    await prisma.$connect();
    console.log("✅  Database connected");

    app.listen(PORT, () => {
      console.log(`🚀  Circular Match API running on http://localhost:${PORT}`);
      console.log(`📋  Health: http://localhost:${PORT}/health`);
      console.log(`🔑  Auth:   POST /api/auth/register | POST /api/auth/login`);
      console.log(`🗂   Wastes: GET/POST /api/wastes`);
      console.log(`🔗  Match:  GET /api/matches/recommendations`);
      console.log(`📄  Report: GET /api/reports/esg/download`);
    });
  } catch (err) {
    console.error("❌  Failed to start server:", err);
    await prisma.$disconnect();
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received — shutting down gracefully");
  await prisma.$disconnect();
  process.exit(0);
});

main();
