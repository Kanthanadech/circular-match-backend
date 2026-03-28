"use strict";
// src/services/maps.service.ts
// Google Maps Distance Matrix API integration
// Docs: https://developers.google.com/maps/documentation/distance-matrix
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDrivingDistances = getDrivingDistances;
/**
 * Calls Google Distance Matrix API to get DRIVING distance and time
 * between a single origin and multiple destinations in one request.
 *
 * Returns an array of results in the same order as `destinations`.
 * Falls back to Haversine if GOOGLE_MAPS_API_KEY is not configured.
 */
async function getDrivingDistances(originLat, originLng, destinations) {
    const results = new Map();
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    // ── Fallback: Haversine (no API key / dev mode) ────────────────────────────
    if (!apiKey) {
        console.warn("[Maps] No API key — falling back to Haversine formula");
        for (const dest of destinations) {
            const distKm = haversine(originLat, originLng, dest.lat, dest.lng);
            results.set(dest.id, {
                distanceKm: distKm,
                // Estimate: 40 km/h average urban speed
                durationMins: Math.round((distKm / 40) * 60),
            });
        }
        return results;
    }
    // ── Real Google Distance Matrix API ───────────────────────────────────────
    const origin = `${originLat},${originLng}`;
    // API supports up to 25 destinations per request — chunk if needed
    const CHUNK_SIZE = 25;
    for (let i = 0; i < destinations.length; i += CHUNK_SIZE) {
        const chunk = destinations.slice(i, i + CHUNK_SIZE);
        const destParam = chunk
            .map((d) => `${d.lat},${d.lng}`)
            .join("|");
        const url = `https://maps.googleapis.com/maps/api/distancematrix/json` +
            `?origins=${encodeURIComponent(origin)}` +
            `&destinations=${encodeURIComponent(destParam)}` +
            `&mode=driving` +
            `&units=metric` +
            `&language=th` +
            `&key=${apiKey}`;
        const res = await fetch(url);
        const data = (await res.json());
        if (data.status !== "OK") {
            console.error("[Maps] Distance Matrix API error:", data.status);
            // Partial fallback for this chunk
            for (const dest of chunk) {
                const distKm = haversine(originLat, originLng, dest.lat, dest.lng);
                results.set(dest.id, { distanceKm: distKm, durationMins: Math.round((distKm / 40) * 60) });
            }
            continue;
        }
        // data.rows[0] = the single origin row
        const elements = data.rows[0].elements;
        chunk.forEach((dest, idx) => {
            const el = elements[idx];
            if (el?.status === "OK") {
                results.set(dest.id, {
                    distanceKm: parseFloat((el.distance.value / 1000).toFixed(2)),
                    durationMins: Math.round(el.duration.value / 60),
                });
            }
            else {
                // Element-level fallback
                const distKm = haversine(originLat, originLng, dest.lat, dest.lng);
                results.set(dest.id, { distanceKm: distKm, durationMins: Math.round((distKm / 40) * 60) });
            }
        });
    }
    return results;
}
// ─── Haversine Formula (Fallback) ─────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const toRad = (d) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return parseFloat((R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(2));
}
//# sourceMappingURL=maps.service.js.map