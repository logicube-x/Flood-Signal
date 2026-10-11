/**
 * Duplicate Report Detection Engine
 * 
 * Uses Haversine distance formula and temporal windowing to locate
 * existing reports near a proposed incident location.
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Calculates great-circle distance between two coordinates in meters.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' ||
      typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    return Infinity;
  }

  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c);
}

/**
 * Locates potential duplicate reports near a given location.
 * 
 * @param {Array} existingReports Array of Report mongoose documents or objects
 * @param {Object} candidate { lat, lng, timeWindowHours, distanceMeters }
 * @returns {Array} List of potential duplicates with distance and delta info
 */
export function findPotentialDuplicates(existingReports = [], candidate = {}) {
  const { 
    lat, 
    lng, 
    timeWindowHours = Number(process.env.DUPLICATE_TIME_HOURS) || 4,
    maxDistanceMeters = Number(process.env.DUPLICATE_DISTANCE_METERS) || 300
  } = candidate;

  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    return [];
  }

  const now = Date.now();
  const timeWindowMs = timeWindowHours * 60 * 60 * 1000;
  const potentialMatches = [];

  for (const report of existingReports) {
    if (!report || report.status === 'Resolved') continue;

    // Normalize coordinates
    const rLat = typeof report.lat === 'number' ? report.lat : null;
    const rLng = typeof report.lng === 'number' ? report.lng : null;
    if (rLat === null || rLng === null) continue;

    // Check time window
    const reportTime = report.createdAt ? new Date(report.createdAt).getTime() : (report.timestamp || 0);
    const ageMs = now - reportTime;
    if (ageMs < 0 || ageMs > timeWindowMs) continue;

    // Calculate distance
    const distanceMeters = calculateDistanceMeters(lat, lng, rLat, rLng);
    if (distanceMeters <= maxDistanceMeters) {
      potentialMatches.push({
        id: report.id || report._id?.toString(),
        title: report.title,
        status: report.status,
        verified: !!report.verified,
        distanceMeters,
        depth: report.depth,
        severity: report.severity,
        timeAgo: Math.round(ageMs / (60 * 1000)) // in minutes
      });
    }
  }

  // Sort by closest distance first
  return potentialMatches.sort((a, b) => a.distanceMeters - b.distanceMeters);
}
