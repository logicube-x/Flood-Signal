import assert from 'assert';
import { 
  validateCoordinates, 
  categorizeRainfall, 
  fetchEnvironmentalTelemetry,
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

  // Test 3: Successful Provider Response (Mocked fixture)
  console.log('Test 3: Successful live provider response');
  const mockFetchSuccess = async () => ({
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
        precipitation: [4.2, 3.1, 2.0, 1.0, 0.5, 0.0, 0.0, 0.0]
      }
    })
  });

  const liveResult = await fetchEnvironmentalTelemetry(22.3072, 73.1812, { fetchFn: mockFetchSuccess });
  assert.strictEqual(liveResult.status, 'success');
  assert.strictEqual(liveResult.isLive, true);
  assert.strictEqual(liveResult.measurements.currentRainfall.value, 4.2);
  assert.strictEqual(liveResult.measurements.currentRainfall.unit, 'mm/h');
  assert.strictEqual(liveResult.measurements.currentRainfall.category, 'Moderate');
  assert.strictEqual(liveResult.measurements.currentRainfall.isObserved, true);
  assert.strictEqual(liveResult.measurements.rainfallForecast6h.value, 10.8);
  assert.strictEqual(liveResult.measurements.rainfallForecast6h.isForecast, true);
  assert.strictEqual(liveResult.measurements.waterLevelGauge.stationCode, 'VMC-KALAGHODA-01');
  assert.strictEqual(liveResult.measurements.waterLevelGauge.sensorNetworkAvailable, false);
  assert.strictEqual(liveResult.measurements.waterLevelGauge.status, 'benchmark_only');
  console.log('✓ Passed Test 3: Successful provider response correctly parsed with distinct observation vs forecast');

  // Test 4: Rate Limiting (HTTP 429) Graceful Fallback
  console.log('Test 4: Provider HTTP 429 Rate Limit handled gracefully');
  const mockFetch429 = async () => ({
    ok: false,
    status: 429,
    statusText: 'Too Many Requests'
  });

  const rateLimitedResult = await fetchEnvironmentalTelemetry(22.3072, 73.1812, { fetchFn: mockFetch429 });
  assert.strictEqual(rateLimitedResult.status, 'fallback');
  assert.strictEqual(rateLimitedResult.isLive, false);
  assert.strictEqual(rateLimitedResult.providerType, 'rate_limited');
  assert.strictEqual(rateLimitedResult.measurements.currentRainfall.value, null);
  assert.strictEqual(rateLimitedResult.measurements.currentRainfall.category, 'Unavailable');
  console.log('✓ Passed Test 4: Rate-limited provider safely returns labeled fallback state');

  // Test 5: Provider Timeout Handled Gracefully
  console.log('Test 5: Provider timeout handled gracefully');
  const mockFetchTimeout = async () => {
    const error = new Error('The operation was aborted');
    error.name = 'AbortError';
    throw error;
  };

  const timeoutResult = await fetchEnvironmentalTelemetry(22.3072, 73.1812, { fetchFn: mockFetchTimeout });
  assert.strictEqual(timeoutResult.status, 'fallback');
  assert.strictEqual(timeoutResult.isLive, false);
  assert.strictEqual(timeoutResult.providerType, 'timeout');
  console.log('✓ Passed Test 5: Timeout safely yields non-crashing fallback');

  // Test 6: Malformed / Non-JSON Provider Response
  console.log('Test 6: Malformed response handled safely');
  const mockFetchMalformed = async () => ({
    ok: true,
    status: 200,
    json: async () => '<html>Error 500</html>' // Malformed, not object
  });

  const malformedResult = await fetchEnvironmentalTelemetry(22.3072, 73.1812, { fetchFn: mockFetchMalformed });
  assert.strictEqual(malformedResult.status, 'fallback');
  assert.strictEqual(malformedResult.isLive, false);
  assert.strictEqual(malformedResult.providerType, 'malformed');
  console.log('✓ Passed Test 6: Malformed provider payload rejected gracefully');

  // Test 7: Secret Hygiene - Ensure no secrets or API keys are leaked in telemetry output
  console.log('Test 7: Secret hygiene check on telemetry payload');
  const telemetryJson = JSON.stringify(liveResult);
  assert.strictEqual(telemetryJson.includes('JWT_SECRET'), false);
  assert.strictEqual(telemetryJson.includes('MONGODB_URI'), false);
  assert.strictEqual(telemetryJson.includes('password'), false);
  assert.strictEqual(telemetryJson.includes('apiKey'), false);
  console.log('✓ Passed Test 7: Zero credentials leaked in telemetry output');

  // Test 8: Water Gauge Context Honesty
  console.log('Test 8: Honest water gauge benchmark validation');
  assert.strictEqual(VADODARA_REFERENCE_GAUGE.sensorNetworkAvailable, false);
  assert.strictEqual(typeof VADODARA_REFERENCE_GAUGE.warningLevelMeters, 'number');
  assert.strictEqual(typeof VADODARA_REFERENCE_GAUGE.dangerLevelMeters, 'number');
  assert.ok(VADODARA_REFERENCE_GAUGE.note.includes('Automated ultrasonic IoT gauge network is currently not deployed'));
  console.log('✓ Passed Test 8: Water gauge strictly labeled as benchmark without inventing IoT readings');

  console.log('====================================================');
  console.log('ALL 8 FEATURE 4 TELEMETRY TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runTelemetryTests().catch(err => {
  console.error('Feature 4 Telemetry Test Failed:', err);
  process.exit(1);
});
