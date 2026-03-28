import { DistanceMatrixResult } from "../types";
/**
 * Calls Google Distance Matrix API to get DRIVING distance and time
 * between a single origin and multiple destinations in one request.
 *
 * Returns an array of results in the same order as `destinations`.
 * Falls back to Haversine if GOOGLE_MAPS_API_KEY is not configured.
 */
export declare function getDrivingDistances(originLat: number, originLng: number, destinations: {
    lat: number;
    lng: number;
    id: string;
}[]): Promise<Map<string, DistanceMatrixResult>>;
//# sourceMappingURL=maps.service.d.ts.map