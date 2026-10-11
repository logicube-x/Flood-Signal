/**
 * Prioritisation Scoring Module
 * This is a deterministic, heuristic-based system to help responders prioritize 
 * community-reported incidents. It is NOT predictive AI and does not forecast floods.
 * All reports remain unverified until reviewed by municipal responders.
 */

export function calculatePriority(incident) {
  let score = 0;
  const explanation = [];
  
  // 1. Critical Facility proximity
  if (incident.criticalFacility) {
    score += 30;
    explanation.push('Near critical facility (+30)');
  }
  
  // 2. Road Blockage
  if (incident.roadBlocked) {
    score += 15;
    explanation.push('Road reported blocked (+15)');
  }
  
  // 3. User Reported Severity
  const userSevMap = { low: 5, medium: 15, high: 25, critical: 35 };
  const sevVal = userSevMap[incident.severity] || 0;
  if (sevVal > 0) {
    score += sevVal;
    explanation.push(`Citizen marked as ${incident.severity} severity (+${sevVal})`);
  }
  
  // 4. Depth (0-500cm)
  const depth = parseInt(incident.depth, 10) || 0;
  if (depth > 100) {
    score += 25;
    explanation.push(`Severe depth >100cm (+25)`);
  } else if (depth > 40) {
    score += 15;
    explanation.push(`Moderate depth >40cm (+15)`);
  } else if (depth > 15) {
    score += 5;
    explanation.push(`Minor depth >15cm (+5)`);
  }
  
  // 5. Freshness / Age Penalty
  let isStale = false;
  if (incident.timestamp) {
    const hoursOld = (Date.now() - incident.timestamp) / (1000 * 60 * 60);
    if (hoursOld > 6) {
      isStale = true;
      score = Math.max(0, score - 20);
      explanation.push('Report is >6 hours old, flagged for re-verification (-20)');
    }
  }

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(0, score));
  
  // Determine Priority Label
  let label = 'low';
  if (score >= 75) label = 'critical';
  else if (score >= 50) label = 'high';
  else if (score >= 25) label = 'medium';

  return {
    score,
    label,
    explanation,
    isStale
  };
}
