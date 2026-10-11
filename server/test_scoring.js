import assert from 'node:assert';
import { calculatePriority, normalizeSeverity, RISK_LEVELS } from './lib/scoring.js';

console.log('=== FEATURE 1 UNIT TEST SUITE: FLOOD HOTSPOT INTELLIGENCE ===\n');

// 1. Boundary & Category Tests
const now = Date.now();

// Low Risk Boundary (Score < 25)
const lowIncident = {
  depth: 10,                 // +0 (<=15cm)
  severity: 'low',           // +5
  roadBlocked: false,        // +0
  criticalFacility: false,   // +0
  timestamp: now             // 0
};
const lowResult = calculatePriority(lowIncident);
assert.strictEqual(lowResult.score, 5, `Expected score 5, got ${lowResult.score}`);
assert.strictEqual(lowResult.label, RISK_LEVELS.LOW, `Expected label Low, got ${lowResult.label}`);
assert.strictEqual(lowResult.isStale, false);
console.log('[Test 1: Low Risk Category] PASSED (Score: 5, Label: Low)');

// Moderate Risk Boundary (Score 25 - 49)
const moderateIncident = {
  depth: 25,                 // +5 (>15cm)
  severity: 'moderate',      // +15
  roadBlocked: false,        // +0
  criticalFacility: false,   // +0
  timestamp: now
};
// 5 + 15 = 20... let's add roadBlocked or depth >40 to reach Moderate range (25 - 49)
const modIncident2 = {
  depth: 45,                 // +15 (>40cm)
  severity: 'moderate',      // +15
  roadBlocked: false,
  criticalFacility: false,
  timestamp: now
};
const modResult = calculatePriority(modIncident2);
assert.strictEqual(modResult.score, 30, `Expected score 30, got ${modResult.score}`);
assert.strictEqual(modResult.label, RISK_LEVELS.MODERATE, `Expected label Moderate, got ${modResult.label}`);
console.log('[Test 2: Moderate Risk Category] PASSED (Score: 30, Label: Moderate)');

// Backward Compatibility Test: 'medium' severity maps cleanly to Moderate
const medIncident = {
  depth: 45,                 // +15
  severity: 'medium',        // +15
  roadBlocked: false,
  criticalFacility: false,
  timestamp: now
};
const medResult = calculatePriority(medIncident);
assert.strictEqual(medResult.score, 30);
assert.strictEqual(medResult.label, RISK_LEVELS.MODERATE);
console.log('[Test 3: Backward Compatibility for "medium" severity] PASSED');

// High Risk Boundary (Score 50 - 74)
const highIncident = {
  depth: 50,                 // +15
  severity: 'high',          // +25
  roadBlocked: true,         // +15
  criticalFacility: false,   // +0
  timestamp: now             // total = 55
};
const highResult = calculatePriority(highIncident);
assert.strictEqual(highResult.score, 55, `Expected score 55, got ${highResult.score}`);
assert.strictEqual(highResult.label, RISK_LEVELS.HIGH, `Expected label High, got ${highResult.label}`);
console.log('[Test 4: High Risk Category] PASSED (Score: 55, Label: High)');

// Critical Risk Boundary (Score >= 75)
const critIncident = {
  depth: 120,                // +25 (>100cm)
  severity: 'critical',      // +35
  roadBlocked: true,         // +15
  criticalFacility: true,    // +30
  timestamp: now             // 25+35+15+30 = 105 capped to 100
};
const critResult = calculatePriority(critIncident);
assert.strictEqual(critResult.score, 100, `Expected score 100, got ${critResult.score}`);
assert.strictEqual(critResult.label, RISK_LEVELS.CRITICAL, `Expected label Critical, got ${critResult.label}`);
console.log('[Test 5: Critical Risk Category & 100 Capping] PASSED (Score: 100, Label: Critical)');

// 2. Missing Inputs & Robustness Tests
const emptyIncident = {};
const emptyResult = calculatePriority(emptyIncident);
assert.strictEqual(emptyResult.score, 0);
assert.strictEqual(emptyResult.label, RISK_LEVELS.LOW);
assert.ok(emptyResult.explanation.some(e => e.includes('unconfirmed') || e.includes('unrecorded')));
console.log('[Test 6: Graceful Handling of Empty Incident] PASSED (Score: 0, Label: Low)');

// Invalid/Non-numeric Depth and Invalid Severity
const invalidIncident = {
  depth: 'invalid-depth',
  severity: 'extreme-unknown',
  criticalFacility: null,
  roadBlocked: undefined
};
const invalidResult = calculatePriority(invalidIncident);
assert.strictEqual(invalidResult.score, 0);
assert.strictEqual(invalidResult.label, RISK_LEVELS.LOW);
assert.ok(invalidResult.explanation.some(e => e.includes('Depth measurement unrecorded')));
assert.ok(invalidResult.explanation.some(e => e.includes('Severity unrated')));
console.log('[Test 7: Graceful Handling of Malformed Data] PASSED (No NaN or runtime crashes)');

// String numbers for depth (e.g., from form inputs)
const stringDepthIncident = {
  depth: '60',
  severity: 'low',
  timestamp: now
};
const stringDepthResult = calculatePriority(stringDepthIncident);
assert.strictEqual(stringDepthResult.score, 20); // 15 (depth>40) + 5 (low sev)
console.log('[Test 8: String-encoded numbers parsed safely] PASSED');

// 3. Stale Penalty Test (>6 hours)
const eightHoursAgo = now - (8 * 60 * 60 * 1000);
const staleIncident = {
  depth: 60,                 // +15
  severity: 'critical',      // +35
  criticalFacility: true,    // +30
  timestamp: eightHoursAgo   // 80 - 20 stale penalty = 60
};
const staleResult = calculatePriority(staleIncident);
assert.strictEqual(staleResult.isStale, true);
assert.strictEqual(staleResult.score, 60, `Expected score 60 after penalty, got ${staleResult.score}`);
assert.strictEqual(staleResult.label, RISK_LEVELS.HIGH);
assert.ok(staleResult.explanation.some(e => e.includes('Stale penalty')));
console.log('[Test 9: Temporal Stale Penalty (-20 pts floor)] PASSED');

// Score Floor Test (Penalty cannot drop below 0)
const staleLowIncident = {
  depth: 5,                  // +0
  severity: 'low',           // +5
  timestamp: eightHoursAgo   // 5 - 20 = -15 floored to 0
};
const staleLowResult = calculatePriority(staleLowIncident);
assert.strictEqual(staleLowResult.score, 0);
assert.strictEqual(staleLowResult.label, RISK_LEVELS.LOW);
console.log('[Test 10: Score Floor Protection (No negative scores)] PASSED');

console.log('\n=== ALL 10 TESTS PASSED ===');
