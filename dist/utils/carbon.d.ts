export declare const EMISSION_FACTORS: Record<string, number>;
/**
 * Calculate net carbon saved when waste is diverted from landfill
 *
 * Formula:
 *   landfill_saved = weight_kg × EF_material
 *   transport_emit = distance_km × 0.07
 *   net_saved      = landfill_saved - transport_emit
 */
export declare function calculateCarbonSaved(category: string, weightKg: number, distanceKm: number): number;
/**
 * Convert carbon saved to Thai Baht (Thailand Voluntary Carbon Market)
 * Rate: ~฿5 per kgCO2e
 */
export declare function carbonToCreditValue(carbonKg: number): number;
//# sourceMappingURL=carbon.d.ts.map