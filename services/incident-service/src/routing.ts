export interface LocationPoint {
  latitude: number;
  longitude: number;
}

export interface ResponseCenter extends LocationPoint {
  id: string;
  name?: string;
  status: "available" | "assigned" | "unavailable";
}

export interface NearestCenterResult {
  center: ResponseCenter;
  distanceKm: number;
  etaMinutes: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return value * Math.PI / 180;
}

export function haversineDistanceKm(a: LocationPoint, b: LocationPoint): number {
  const lat1 = toRadians(a.latitude);
  const lon1 = toRadians(a.longitude);
  const lat2 = toRadians(b.latitude);
  const lon2 = toRadians(b.longitude);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;
  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);

  const square = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(square), Math.sqrt(1 - square));
}

export function calculateEtaMinutes(distanceKm: number, speedKmh = 60): number {
  const safeSpeed = speedKmh > 0 ? speedKmh : 60;
  return Math.round((distanceKm / safeSpeed) * 60 * 10) / 10;
}

export function findNearestResponseCenter(
  incident: LocationPoint,
  centers: ResponseCenter[],
  options?: { availableOnly?: boolean; speedKmh?: number }
): NearestCenterResult | null {
  const { availableOnly = true, speedKmh = 60 } = options ?? {};
  const candidates = availableOnly
    ? centers.filter(center => center.status === "available")
    : centers.slice();

  if (candidates.length === 0) {
    return null;
  }

  let nearest: ResponseCenter | null = null;
  let minDistance = Infinity;
  for (const center of candidates) {
    const distanceKm = haversineDistanceKm(incident, center);
    if (distanceKm < minDistance) {
      minDistance = distanceKm;
      nearest = center;
    }
  }

  if (!nearest) {
    return null;
  }

  return {
    center: nearest,
    distanceKm: Math.round(minDistance * 100) / 100,
    etaMinutes: calculateEtaMinutes(minDistance, speedKmh),
  };
}

export function selectNearestResponseCenter(
  incident: LocationPoint,
  centers: ResponseCenter[],
  speedKmh = 60,
) {
  return findNearestResponseCenter(incident, centers, { availableOnly: true, speedKmh });
}
