/**
 * Flood Hotspot Intelligence & Heuristic Priority Scoring Engine
 * 
 * TRANSPARENCY NOTICE:
 * This is a deterministic, rule-based heuristic scoring engine developed for municipal
 * dispatchers and citizens to prioritize community-reported waterlogging incidents.
 * It is NOT predictive AI, machine learning, or an official hydrological flood forecast.
 * All incident reports remain unverified citizen observations until officially assessed
 * by municipal response crews.
 *
 * Scoring Formula Breakdown (0 - 100 points scale):
 * ----------------------------------------------------
 * 1. Critical Facility Proximity: +30 points
 *    - Nearby hospitals, emergency stations, power substations, transit hubs.
 * 2. Impassable Roadway / Blockage: +15 points
 *    - Complete stoppage of vehicular or emergency transit.
 * 3. Citizen Reported Severity:
 *    - Critical: +35 points
 *    - High:     +25 points
 *    - Moderate: +15 points
 *    - Low:      +5 points
 *    - Missing/Invalid: Explicitly noted (+0 points, flagged for field review)
 * 4. Water Depth Measurement (normalized 0 - 500 cm):
 *    - Severe (>100 cm):   +25 points
 *    - Moderate (>40 cm):  +15 points
 *    - Minor (>15 cm):     +5 points
 *    - Minimal (<=15 cm):  +0 points
 *    - Missing/Unmeasured: Explicitly noted (+0 points, flagged as unmeasured)
 * 5. Temporal Freshness / Stale Penalty:
 *    - Reports older than 6 hours incur a -20 point penalty (floor at 0)
 *      flagged for re-verification due to changing drainage conditions.
 *
 * Standardized Risk Categories:
 * -----------------------------
 * - Critical: Score >= 75
 * - High:     Score 50 - 74
 * - Moderate: Score 25 - 49
 * - Low:      Score 0 - 24
 */

export const RISK_LEVELS = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  CRITICAL: 'Critical'
};

/**
 * Normalizes severity inputs to standard canonical strings.
 * Explicitly rejects and documents missing or unexpected values.
 */
export function normalizeSeverity(severity) {
  if (typeof severity !== 'string') return null;
  const s = severity.trim().toLowerCase();
  if (s === 'low') return 'low';
  if (s === 'moderate' || s === 'medium') return 'moderate';
  if (s === 'high') return 'high';
  if (s === 'critical') return 'critical';
  return null;
}

/**
 * Calculates deterministic risk score and explanation for an incident.
 * Handles missing/invalid inputs explicitly without inventing measurements.
 * 
 * @param {Object} incident Incident data containing depth, severity, roadBlocked, criticalFacility, timestamp
 * @returns {Object} { score: number, label: 'Low'|'Moderate'|'High'|'Critical', explanation: string[], isStale: boolean }
 */
export function calculatePriority(incident = {}) {
  let score = 0;
  const explanation = [];

  // 1. Critical Facility Proximity
  if (incident.criticalFacility === true) {
    score += 30;
    explanation.push('Critical facility proximity (+30 pts)');
  } else if (incident.criticalFacility === false) {
    explanation.push('No nearby critical facility reported (+0 pts)');
  } else {
    explanation.push('Critical facility status unconfirmed (+0 pts)');
  }

  // 2. Road Blockage
  if (incident.roadBlocked === true) {
    score += 15;
    explanation.push('Roadway impassable / transit blocked (+15 pts)');
  } else if (incident.roadBlocked === false) {
    explanation.push('Roadway passable (+0 pts)');
  } else {
    explanation.push('Roadway blockage unconfirmed (+0 pts)');
  }

  // 3. User Reported Severity
  const normalizedSev = normalizeSeverity(incident.severity);
  const userSevMap = {
    low: { pts: 5, name: 'Low' },
    moderate: { pts: 15, name: 'Moderate' },
    high: { pts: 25, name: 'High' },
    critical: { pts: 35, name: 'Critical' }
  };

  if (normalizedSev && userSevMap[normalizedSev]) {
    const { pts, name } = userSevMap[normalizedSev];
    score += pts;
    explanation.push(`Citizen reported severity: ${name} (+${pts} pts)`);
  } else {
    explanation.push('Severity unrated or unspecified (+0 pts, requires crew assessment)');
  }

  // 4. Depth (0-500 cm)
  const rawDepth = incident.depth;
  const parsedDepth = (typeof rawDepth === 'number' && !isNaN(rawDepth))
    ? rawDepth
    : (typeof rawDepth === 'string' && rawDepth.trim() !== '' && !isNaN(Number(rawDepth)))
      ? Number(rawDepth)
      : null;

  if (parsedDepth !== null) {
    const clampedDepth = Math.max(0, Math.min(500, parsedDepth));
    if (clampedDepth > 100) {
      score += 25;
      explanation.push(`Severe water depth ${clampedDepth} cm > 100 cm (+25 pts)`);
    } else if (clampedDepth > 40) {
      score += 15;
      explanation.push(`Moderate water depth ${clampedDepth} cm > 40 cm (+15 pts)`);
    } else if (clampedDepth > 15) {
      score += 5;
      explanation.push(`Minor water depth ${clampedDepth} cm > 15 cm (+5 pts)`);
    } else {
      explanation.push(`Minimal water depth ${clampedDepth} cm <= 15 cm (+0 pts)`);
    }
  } else {
    explanation.push('Depth measurement unrecorded (+0 pts, pending on-site gauge)');
  }

  // 5. Freshness / Age Penalty
  let isStale = false;
  const rawTs = incident.timestamp || incident.createdAt;
  const tsNum = rawTs instanceof Date ? rawTs.getTime() : typeof rawTs === 'number' ? rawTs : typeof rawTs === 'string' ? new Date(rawTs).getTime() : NaN;

  if (!isNaN(tsNum) && tsNum > 0) {
    const hoursOld = (Date.now() - tsNum) / (1000 * 60 * 60);
    if (hoursOld > 6) {
      isStale = true;
      score = Math.max(0, score - 20);
      explanation.push(`Report submitted ${Math.round(hoursOld)}h ago (>6h old) - Stale penalty (-20 pts)`);
    } else {
      explanation.push('Report submitted within past 6h - Active observation');
    }
  } else {
    explanation.push('Submission timestamp unavailable - No age modifier applied');
  }

  // Cap score strictly between 0 and 100
  score = Math.min(100, Math.max(0, score));

  // Determine Standardized Risk Category
  let label = RISK_LEVELS.LOW;
  if (score >= 75) {
    label = RISK_LEVELS.CRITICAL;
  } else if (score >= 50) {
    label = RISK_LEVELS.HIGH;
  } else if (score >= 25) {
    label = RISK_LEVELS.MODERATE;
  } else {
    label = RISK_LEVELS.LOW;
  }

  return {
    score,
    label,
    explanation,
    isStale
  };
}
