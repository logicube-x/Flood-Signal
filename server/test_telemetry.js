import assert from 'assert';
import { 
  validateCoordinates, 
  categorizeRainfall, 
  fetchEnvironmentalTelemetry,
  calculateNext6HourForecast,
  clearTelemetryCache,
  VADODARA_REFERENCE_GAUGE
} from './lib/telemetry.js';

async function runTelemetryTests() {
  console.log('--- RUNNING FEATURE 4: TELEMETRY & ENVIRONMENTAL CONTEXT TESTS ---');

  // Test 1: Coordinate Validation
  console.log('Test 1: Coordinate validation');
  assert.strictEqual(validateCoordinates(22.3072, 73.1812).valid, true);
  assert.strictEqual(validateCoordinates('22.3072', '73.1812').valid, true);
  assert.strictEqual(validateCoordinates(95, 73.1812).valid, false, 'Latitude > 90 must fail');
  assert.strictEqual(validateCoordinates(-95, 73.1812).valid, false, 'Latitude < -90 must fail');
  assert.strictEqual(validateCoordinates(22.3072, 190).valid, false, 'Longitude > 180 must fail');
  assert.strictEqual(validateCoordinates(22.3072, -190).valid, false, 'Longitude < -180 must fail');
  assert.strictEqual(validateCoordinates('abc', 73.1812).valid, false, 'Non-numeric latitude must fail');
  assert.strictEqual(validateCoordinates(22.3072, 'xyz').valid, false, 'Non-numeric longitude must fail');
  console.log('✓ Passed Test 1: Coordinate validation accepts valid floats and rejects out-of-range or malformed inputs');

  // Test 2: Rainfall Categorization
  console.log('Test 2: Categorization of rainfall rates');
  assert.strictEqual(categorizeRainfall(0), 'None');
  assert.strictEqual(categorizeRainfall(1.5), 'Light');
  assert.strictEqual(categorizeRainfall(5.0), 'Moderate');
  assert.strictEqual(categorizeRainfall(15.0), 'Heavy');
  assert.strictEqual(categorizeRainfall(60.0), 'Violent Torrential');
  console.log('✓ Passed Test 2: Categorization aligns with meteorological standards');

  // Clear cache prior to network simulation tests
  clearTelemetryCache();

  // Test 3: Successful Provider Response (Mocked fixture)
  console.log('Test 3: Successful live provider response');
  let fetchCallCount = 0;
  const mockFetchSuccess = async () => {
    fetchCallCount++;
    return {
      ok: true,
      status: 200,
      json: async () => ({
        latitude: 22.3,
        longitude: 73.18,
        current: {
          time: '2026-10-11T09:15',
          precipitation: 4.2,
          rain: 4.2,
          weather_code: 61
        },
        hourly: {
          time: [
            '2026-10-11T07:00',
            '2026-10-11T08:00',
            '2026-10-11T09:00',
            '2026-10-11T10:00',
            '2026-10-11T11:00',
            '2026-10-11T12:00',
            '2026-10-11T13:00',
            '2026-10-11T14:00',
            '2026-10-11T15:00'
          ],
          precipitation: [0.0, 1.0, 4.2, 3.1, 2.0, 1.0, 0.5, 0.0, 0.0]
        }
      })
    };
  };

  const liveResult = await fetchEnvironmentalTelemetry(22.3072, 73.1812, { fetchFn: mockFetchSuccess });
  assert.strictEqual(liveResult.status, 'success');
  assert.strictEqual(liveResult.isLive, true);
  assert.strictEqual(liveResult.measurements.currentRainfall.value, 4.2);
  assert.strictEqual(liveResult.measurements.currentRainfall.unit, 'mm/h');
  assert.strictEqual(liveResult.measurements.currentRainfall.category, 'Moderate');
  assert.strictEqual(liveResult.measurements.currentRainfall.isObserved, true);
  // Starts at 09:00 -> indices 2 to 7 -> [4.2, 3.1, 2.0, 1.0, 0.5, 0.0] = 10.8
  assert.strictEqual(liveResult.measurements.rainfallForecast6h.value, 10.8);
  assert.strictEqual(liveResult.measurements.rainfallForecast6h.isForecast, true);
  assert.strictEqual(liveResult.measurements.waterLevelGauge.stationCode, 'VMC-KALAGHODA-01');
  assert.strictEqual(liveResult.measurements.waterLevelGauge.sensorNetworkAvailable, false);
  assert.strictEqual(liveResult.measurements.waterLevelGauge.status, 'benchmark_only');
  assert.strictEqual(fetchCallCount, 1);
  console.log('✓ Passed Test 3: Successful provider response correctly parsed with distinct observation vs forecast');

  // Test 4: In-Memory Caching (Reusing cached response within TTL)
  console.log('Test 4: In-memory cache returns cached data without refetching');
  const cachedResult = await fetchEnvironmentalTelemetry(22.3072, 73.1812, { fetchFn: mockFetchSuccess });
  assert.strictEqual(cachedResult.status, 'success');
  assert.strictEqual(cachedResult.isCached, true);
  assert.strictEqual(cachedResult.measurements.currentRainfall.value, 4.2);
  assert.strictEqual(fetchCallCount, 1, 'Provider fetch must not be called again within cache TTL');
  console.log('✓ Passed Test 4: In-memory cache successfully reused without redundant provider calls');

  // Test 5: In-Flight Request Deduplication for Concurrent Requests
  console.log('Test 5: Concurrent requests for same coordinates are deduplicated');
  clearTelemetryCache();
  let concurrentCalls = 0;
  const mockSlowFetch = async () => {
    concurrentCalls++;
    await new Promise(r => setTimeout(r, 50));
    return {
      ok: true,
      status: 200,
      json: async () => ({
        current: { time: '2026-10-11T10:00', precipitation: 1.0 },
        hourly: { time: ['2026-10-11T10:00'], precipitation: [1.0] }
      })
    };
  };

  const [resA, resB, resC] = await Promise.all([
    fetchEnvironmentalTelemetry(19.0760, 72.8777, { fetchFn: mockSlowFetch }),
    fetchEnvironmentalTelemetry(19.0760, 72.8777, { fetchFn: mockSlowFetch }),
    fetchEnvironmentalTelemetry(19.0760, 72.8777, { fetchFn: mockSlowFetch })
  ]);
  assert.strictEqual(concurrentCalls, 1, 'Concurrent calls to same coords must share 1 in-flight promise');
  assert.strictEqual(resA.measurements.currentRainfall.value, 1.0);
  assert.strictEqual(resB.measurements.currentRainfall.value, 1.0);
  assert.strictEqual(resC.measurements.currentRainfall.value, 1.0);
  console.log('✓ Passed Test 5: Concurrent in-flight requests deduplicated to a single provider call');

  // Test 6: HTTP 429 Returning Stale Cached Data
  console.log('Test 6: Provider HTTP 429 returns stale cached data when available');
  // At 19.0760, 72.8777 we already have a cached reading from Test 5
  const mockFetch429 = async () => ({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests'
  });

  const staleResult = await fetchEnvironmentalTelemetry(19.0760, 72.8777, { fetchFn: mockFetch429, bypassCache: true });
  assert.strictEqual(staleResult.status, 'success');
  assert.strictEqual(staleResult.isStale, true);
  assert.strictEqual(staleResult.isLive, false);
  assert.strictEqual(staleResult.providerType, 'rate_limited');
  assert.strictEqual(staleResult.measurements.currentRainfall.value, 1.0);
  assert.ok(staleResult.warning.includes('rate limit reached (HTTP 429)'));
  console.log('✓ Passed Test 6: HTTP 429 safely returns clearly-labeled stale telemetry from cache');

  // Test 7: HTTP 429 with Empty Cache Yields Graceful Fallback (with rainfallForecast6h present)
  console.log('Test 7: HTTP 429 with empty cache yields fallback with rainfallForecast6h');
  clearTelemetryCache();
  const rateLimitedFallback = await fetchEnvironmentalTelemetry(28.6139, 77.2090, { fetchFn: mockFetch429 });
  assert.strictEqual(rateLimitedFallback.status, 'fallback');
  assert.strictEqual(rateLimitedFallback.isLive, false);
  assert.strictEqual(rateLimitedFallback.providerType, 'rate_limited');
  assert.strictEqual(rateLimitedFallback.measurements.currentRainfall.value, null);
  assert.strictEqual(rateLimitedFallback.measurements.currentRainfall.category, 'Unavailable');
  assert.strictEqual(rateLimitedFallback.measurements.rainfallForecast6h.value, null);
  assert.strictEqual(rateLimitedFallback.measurements.rainfallForecast6h.unit, 'mm');
  assert.strictEqual(rateLimitedFallback.measurements.rainfallForecast6h.isForecast, true);
  console.log('✓ Passed Test 7: HTTP 429 fallback safely includes rainfallForecast6h field with null value');

  // Test 8: Provider Timeout Handled Gracefully
  console.log('Test 8: Provider timeout handled gracefully');
  const mockFetchTimeout = async () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    throw error;
  };

  const timeoutResult = await fetchEnvironmentalTelemetry(13.0827, 80.2707, { fetchFn: mockFetchTimeout });
  assert.strictEqual(timeoutResult.status, 'fallback');
  assert.strictEqual(timeoutResult.isLive, false);
  assert.strictEqual(timeoutResult.providerType, 'timeout');
  assert.strictEqual(timeoutResult.measurements.rainfallForecast6h.value, null);
  console.log('✓ Passed Test 8: Timeout safely yields non-crashing fallback');

  // Test 9: Malformed / Non-JSON Provider Response
  console.log('Test 9: Malformed response handled safely');
  const mockFetchMalformed = async () => ({
    ok: true,
    status: 200,
    json: async () => '<html>Error 500</html>' // Malformed, not object
  });

  const malformedResult = await fetchEnvironmentalTelemetry(12.9716, 77.5946, { fetchFn: mockFetchMalformed });
  assert.strictEqual(malformedResult.status, 'fallback');
  assert.strictEqual(malformedResult.isLive, false);
  assert.strictEqual(malformedResult.providerType, 'malformed');
  assert.strictEqual(malformedResult.measurements.rainfallForecast6h.value, null);
  console.log('✓ Passed Test 9: Malformed provider payload rejected gracefully');

  // Test 10: 6-Hour Forecast Window Math
  console.log('Test 10: 6-hour forecast window calculations');
  const hourlySample = {
    time: [
      '2026-10-11T00:00',
      '2026-10-11T01:00',
      '2026-10-11T02:00',
      '2026-10-11T03:00',
      '2026-10-11T04:00',
      '2026-10-11T05:00',
      '2026-10-11T06:00',
      '2026-10-11T07:00'
    ],
    precipitation: [1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8]
  };
  // From 02:00 -> indices 2 to 7 (6 slots): 3.3 + 4.4 + 5.5 + 6.6 + 7.7 + 8.8 = 36.3
  const calcTotal = calculateNext6HourForecast(hourlySample, '2026-10-11T02:15');
  assert.strictEqual(calcTotal, 36.3);
  console.log('✓ Passed Test 10: Accurate hourly alignment for 6h forecast window');

  // Test 11: Secret Hygiene - Ensure no secrets or API keys are leaked in telemetry output
  console.log('Test 11: Secret hygiene check on telemetry payload');
  const telemetryJson = JSON.stringify(liveResult);
  assert.strictEqual(telemetryJson.includes('JWT_SECRET'), false);
  assert.strictEqual(telemetryJson.includes('MONGODB_URI'), false);
  assert.strictEqual(telemetryJson.includes('password'), false);
  assert.strictEqual(telemetryJson.includes('apiKey'), false);
  console.log('✓ Passed Test 11: Zero credentials leaked in telemetry output');

  // Test 12: Water Gauge Context Honesty
  console.log('Test 12: Honest water gauge benchmark validation');
  assert.strictEqual(VADODARA_REFERENCE_GAUGE.sensorNetworkAvailable, false);
  assert.strictEqual(typeof VADODARA_REFERENCE_GAUGE.warningLevelMeters, 'number');
  assert.strictEqual(typeof VADODARA_REFERENCE_GAUGE.dangerLevelMeters, 'number');
  assert.ok(VADODARA_REFERENCE_GAUGE.note.includes('Automated ultrasonic IoT gauge network is currently not deployed'));
  console.log('✓ Passed Test 12: Water gauge strictly labeled as benchmark without inventing IoT readings');

  console.log('====================================================');
  console.log('ALL 12 FEATURE 4 TELEMETRY TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runTelemetryTests().catch(err => {
  console.error('Feature 4 Telemetry Test Failed:', err);
  process.exit(1);
});
