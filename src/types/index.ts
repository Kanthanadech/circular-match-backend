// src/types/index.ts

import { Request } from "express";
import { UserRole } from "@prisma/client";

// ─── Authenticated Request ───────────────────────────────────────────────────
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    companyName: string;
    lat: number | null;
    lng: number | null;
  };
}

// ─── Google Distance Matrix API ──────────────────────────────────────────────
export interface DistanceMatrixResult {
  distanceKm: number;
  durationMins: number;
}

export interface WasteWithDistance {
  id: string;
  title: string;
  category: string;
  weightKg: number;
  status: string;
  generator: {
    companyName: string;
    lat: number | null;
    lng: number | null;
  };
  distanceKm: number;
  durationMins: number;
  estimatedCarbonSavedKg: number;
  matchScore: number;
}

// ─── ESG Report ──────────────────────────────────────────────────────────────
export interface ESGReportData {
  company: {
    name: string;
    address: string;
  };
  period: string;
  metrics: {
    totalCarbonSavedKg: number;
    totalWasteRecycledKg: number;
    matchesCompleted: number;
    carbonCreditValueThb: number;
  };
  matchLog: {
    date: string;
    wasteTitle: string;
    category: string;
    weightKg: number;
    distanceKm: number;
    carbonSavedKg: number;
  }[];
  generatedAt: string;
}
