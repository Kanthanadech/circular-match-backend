"use strict";
// src/utils/carbon.ts
// GHG Protocol Scope 3 — Category 5: Waste Generated in Operations
// Emission Factors sourced from IPCC / Thailand TGO
Object.defineProperty(exports, "__esModule", { value: true });
exports.EMISSION_FACTORS = void 0;
exports.calculateCarbonSaved = calculateCarbonSaved;
exports.carbonToCreditValue = carbonToCreditValue;
exports.EMISSION_FACTORS = {
    ORGANIC: 0.32, // kgCO2e per kg (food waste / coffee grounds)
    WOOD: 0.58, // kgCO2e per kg (pallets, lumber)
    OIL: 1.20, // kgCO2e per kg (used cooking oil)
    PLASTIC: 0.75, // kgCO2e per kg
    PAPER: 0.91, // kgCO2e per kg
    METAL: 0.42, // kgCO2e per kg
    OTHER: 0.30, // kgCO2e per kg (conservative default)
};
// Transport emission factor for a 3-ton truck
const TRANSPORT_EMISSION_FACTOR = 0.07; // kgCO2e per km
/**
 * Calculate net carbon saved when waste is diverted from landfill
 *
 * Formula:
 *   landfill_saved = weight_kg × EF_material
 *   transport_emit = distance_km × 0.07
 *   net_saved      = landfill_saved - transport_emit
 */
function calculateCarbonSaved(category, weightKg, distanceKm) {
    const ef = exports.EMISSION_FACTORS[category.toUpperCase()] ?? exports.EMISSION_FACTORS.OTHER;
    const landfillSaved = weightKg * ef;
    const transportEmit = distanceKm * TRANSPORT_EMISSION_FACTOR;
    const netSaved = Math.max(0, landfillSaved - transportEmit);
    return parseFloat(netSaved.toFixed(3));
}
/**
 * Convert carbon saved to Thai Baht (Thailand Voluntary Carbon Market)
 * Rate: ~฿5 per kgCO2e
 */
function carbonToCreditValue(carbonKg) {
    return parseFloat((carbonKg * 5).toFixed(2));
}
//# sourceMappingURL=carbon.js.map