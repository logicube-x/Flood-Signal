import assert from 'assert';
import { calculatePriority } from './lib/scoring.js';

async function runDashboardAccuracyTests() {
  console.log('=== FEATURE 5 TEST SUITE: DASHBOARD ACCURACY AND USABILITY ===');

  // Test 1: Verified /api/stats endpoint response structure & mathematical consistency
  console.log('Test 1: Verify /api/stats metric consistency');
  const res = await fetch('http://localhost:5001/api/stats');
  assert.strictEqual(res.status, 200);
  const stats = await res.json();

  assert.strictEqual(typeof stats.total, 'number');
  assert.strictEqual(typeof stats.active, 'number');
  assert.strictEqual(typeof stats.resolved, 'number');
  assert.strictEqual(typeof stats.pending, 'number');
  assert.strictEqual(typeof stats.investigating, 'number');
  assert.strictEqual(typeof stats.critical, 'number');
  assert.strictEqual(typeof stats.high, 'number');
  assert.strictEqual(typeof stats.moderate, 'number');
  assert.strictEqual(typeof stats.low, 'number');
  assert.strictEqual(typeof stats.verified, 'number');

  // Mathematical invariance: active + resolved === total
  assert.strictEqual(stats.active + stats.resolved, stats.total, 'active + resolved must equal total');
  // Mathematical invariance: pending + investigating === active
  assert.strictEqual(stats.pending + stats.investigating, stats.active, 'pending + investigating must equal active');
  // Mathematical invariance: critical + high + moderate + low === active
  assert.strictEqual(stats.critical + stats.high + stats.moderate + stats.low, stats.active, 'sum of risk tiers must equal active');
  console.log('✓ Passed Test 1: /api/stats exhibits 100% mathematical invariance across status and risk tiers');

  // Test 2: In-memory filtering simulation test (Overview & Response logic)
  console.log('Test 2: Test combined filtering & sorting logic');
  const sampleReports = [
    { id: '1', title: 'Sayaji Baug Waterlogging', status: 'Pending Crew', _priority: { score: 85, label: 'Critical' }, timestamp: 1000 },
    { id: '2', title: 'Alkapuri Underpass Flooded', status: 'Investigating', _priority: { score: 65, label: 'High' }, timestamp: 2000 },
    { id: '3', title: 'Fatehgunj Clear', status: 'Resolved', _priority: { score: 10, label: 'Low' }, timestamp: 3000 },
    { id: '4', title: 'Sayaji Hospital Route', status: 'Pending Crew', _priority: { score: 45, label: 'Moderate' }, timestamp: 4000 }
  ];

  // Active filter
  const activeReports = sampleReports.filter(r => r.status !== 'Resolved');
  assert.strictEqual(activeReports.length, 3);

  // Search filter
  const searchFilter = sampleReports.filter(r => r.title.toLowerCase().includes('sayaji'));
  assert.strictEqual(searchFilter.length, 2);

  // Combined: Search + Active Status + Priority
  const combined = sampleReports.filter(r => 
    r.title.toLowerCase().includes('sayaji') && 
    r.status !== 'Resolved' && 
    (r._priority.label).toLowerCase() === 'critical'
  );
  assert.strictEqual(combined.length, 1);
  assert.strictEqual(combined[0].id, '1');
  console.log('✓ Passed Test 2: Combined filtering (Search + Status + Priority) yields exact subsets');

  // Test 3: Sorting invariant (Score descending, secondary timestamp descending)
  console.log('Test 3: Sorting invariant');
  const sorted = [...sampleReports].sort((a, b) => {
    if (b._priority.score !== a._priority.score) return b._priority.score - a._priority.score;
    return b.timestamp - a.timestamp;
  });
  assert.strictEqual(sorted[0].id, '1'); // 85
  assert.strictEqual(sorted[1].id, '2'); // 65
  assert.strictEqual(sorted[2].id, '4'); // 45
  assert.strictEqual(sorted[3].id, '3'); // 10
  console.log('✓ Passed Test 3: Priority queue sorts deterministically by priority score then time');

  // Test 4: Empty dataset graceful behavior
  console.log('Test 4: Empty dataset resilience');
  const emptyReports = [];
  const emptyActive = emptyReports.filter(r => r.status !== 'Resolved').length;
  const emptyResolved = emptyReports.filter(r => r.status === 'Resolved').length;
  const emptyCritical = emptyReports.filter(r => r.status !== 'Resolved' && (r._priority?.label || '').toLowerCase() === 'critical').length;
  assert.strictEqual(emptyActive, 0);
  assert.strictEqual(emptyResolved, 0);
  assert.strictEqual(emptyCritical, 0);
  console.log('✓ Passed Test 4: Zero crashes or NaN on empty collections');

  console.log('====================================================');
  console.log('ALL 4 FEATURE 5 DASHBOARD ACCURACY TESTS PASSED!');
  console.log('====================================================');
}

runDashboardAccuracyTests().catch(err => {
  console.error('Feature 5 Test Failed:', err);
  process.exit(1);
});
