import https from 'https';

/**
 * Open-Meteo Weather & Environmental Telemetry Service
 *
 * Open-Meteo is a free, open-source environmental weather API based on national
 * meteorological data (e.g. DWD, NOAA, ECMWF). It requires NO private API key,
 * making it transparent, reliable, and auditable.
 *
 * We strictly separate:
 * 1. LIVE OBSERVATIONS: Recent 15-minute precipitation / rain rate (mm/h)
 * 2. 24-HOUR FORECAST: Modeled precipitation expectation
 * 3. RIVER WATER-LEVEL GAUGE CONTEXT: Real Vadodara reference gauge levels
 *    (e.g., Vishwamitri River gauge at Kalaghoda Bridge, Vadodara)
 *    labeled honestly as reference telemetry / baseline benchmark.
 */

const OPEN_METEO_BASE = 'https://api.open-meteo.com/v1/forecast';
const TIMEOUT_MS = 6000;
export const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes TTL

// In-memory cache and in-flight request deduplication store
const telemetryCache = new Map();
const inFlightRequests = new Map();

/**
 * Generates consistent cache key from coordinates rounded to 4 decimals (~11m resolution).
 */
export function getCacheKey(lat, lng) {
  return `${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}`;
}

/**
 * Clears in-memory cache and in-flight requests (primarily for test suite isolation).
 */
export function clearTelemetryCache() {
  telemetryCache.clear();
  inFlightRequests.clear();
}

/**
 * Inspects cache for a given key.
 */
export function getTelemetryCacheEntry(lat, lng) {
  return telemetryCache.get(getCacheKey(lat, lng));
}

// Reference benchmark gauge data for Vadodara municipal catchment
// (Vishwamitri River Kalaghoda gauge warning level is 26.0 ft / 7.92 m)
export const VADODARA_REFERENCE_GAUGE = {
  stationName: 'Kalaghoda Bridge Gauge (Vishwamitri River)',
  stationCode: 'VMC-KALAGHODA-01',
  lat: 22.3072,
  lng: 73.1812,
  warningLevelMeters: 7.92, // 26 ft
  dangerLevelMeters: 9.14,  // 30 ft
  sensorNetworkAvailable: false,
  note: 'Reference municipal catchment benchmark for Vadodara. Automated ultrasonic IoT gauge network is currently not deployed; readings represent historical reference benchmarks.'
};

/**
 * Validates geographical coordinates.
 * @param {number|string} lat
 * @param {number|string} lng
 * @returns {{ valid: boolean, lat?: number, lng?: number, error?: string }}
 */
export function validateCoordinates(lat, lng) {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);

  if (isNaN(latitude) || isNaN(longitude)) {
    return { valid: false, error: 'Latitude and longitude must be valid floating point numbers' };
  }

  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90 degrees' };
  }

  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180 degrees' };
  }

  return { valid: true, lat: latitude, lng: longitude };
}

/**
 * Calculates cumulative precipitation for the next 6 hours starting from the observation time.
 * @param {object} hourlyData { time: string[], precipitation: number[] }
 * @param {string} [currentTime] ISO or Open-Meteo local time string (e.g. '2026-10-11T09:00')
 * @returns {number} Sum in mm rounded to 1 decimal place
 */
export function calculateNext6HourForecast(hourlyData, currentTime) {
  if (!hourlyData || !Array.isArray(hourlyData.precipitation)) {
    return 0;
  }

  const precips = hourlyData.precipitation;
  let startIndex = 0;

  if (Array.isArray(hourlyData.time) && currentTime) {
    // Current time from open-meteo format can be "2026-10-11T09:15", compare against hourly "2026-10-11T09:00"
    const currentPrefix = currentTime.slice(0, 13); // "YYYY-MM-DDTHH"
    const matchedIndex = hourlyData.time.findIndex(t => t.startsWith(currentPrefix));
    if (matchedIndex !== -1) {
      startIndex = matchedIndex;
    }
  }

  const next6Slots = precips.slice(startIndex, startIndex + 6);
  const total = next6Slots.reduce((acc, val) => acc + (typeof val === 'number' && !isNaN(val) ? val : 0), 0);
  return Math.round(total * 10) / 10;
}

/**
 * Fetches environmental telemetry from Open-Meteo for given coordinates with caching and deduplication.
 * @param {number} lat
 * @param {number} lng
 * @param {object} [options]
 * @param {Function} [options.fetchFn] Injected fetch implementation for unit testing
 * @param {boolean} [options.bypassCache] Force fetch ignoring active cache
 * @returns {Promise<object>} Structured telemetry payload
 */
export async function fetchEnvironmentalTelemetry(lat, lng, options = {}) {
  const coordCheck = validateCoordinates(lat, lng);
  if (!coordCheck.valid) {
    throw new Error(coordCheck.error);
  }

  const latitude = coordCheck.lat;
  const longitude = coordCheck.lng;
  const cacheKey = getCacheKey(latitude, longitude);
  const now = Date.now();

  // 1. Check in-memory cache for valid fresh entry
  if (!options.bypassCache) {
    const cachedEntry = telemetryCache.get(cacheKey);
    if (cachedEntry && (now - cachedEntry.cachedAt) < CACHE_TTL_MS) {
      return {
        ...cachedEntry.data,
        isCached: true,
        dataFreshnessMinutes: Math.max(1, Math.round((now - cachedEntry.cachedAt) / 60000))
      };
    }
  }

  // 2. In-flight request deduplication for identical coordinates
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  // 3. Launch request wrapped in dedup promise
  const requestPromise = (async () => {
    try {
      return await executeFetchTelemetry(latitude, longitude, options);
    } finally {
      inFlightRequests.delete(cacheKey);
    }
  })();

  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

/**
 * Internal worker to execute the network fetch, parse data, or fallback to stale/cached or offline payload.
 */
async function executeFetchTelemetry(latitude, longitude, options = {}) {
  const fetchImpl = options.fetchFn || globalThis.fetch;
  const cacheKey = getCacheKey(latitude, longitude);
  const existingCached = telemetryCache.get(cacheKey);

  const url = `${OPEN_METEO_BASE}?latitude=${latitude.toFixed(4)}&longitude=${longitude.toFixed(4)}&current=precipitation,rain,weather_code&hourly=precipitation,rain&forecast_days=1&timezone=auto`;

  let responseData = null;
  let isLive = false;
  let providerStatus = 'live';
  let failureReason = null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetchImpl(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'FloodSignal-Emergency-Platform/1.0'
      }
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 429) {
        providerStatus = 'rate_limited';
        failureReason = 'Weather telemetry provider rate limit reached (HTTP 429)';
      } else {
        providerStatus = 'unavailable';
        failureReason = `Weather provider responded with HTTP status ${res.status}`;
      }
    } else {
      responseData = await res.json();
      if (!responseData || typeof responseData !== 'object') {
        providerStatus = 'malformed';
        failureReason = 'Malformed response from weather provider';
      } else {
        isLive = true;
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      providerStatus = 'timeout';
      failureReason = `Weather provider request timed out after ${TIMEOUT_MS}ms`;
    } else {
      providerStatus = 'unavailable';
      failureReason = `Weather provider network error: ${err.message}`;
    }
  }

  const nowIso = new Date().toISOString();

  // If live data retrieved successfully from Open-Meteo
  if (isLive && responseData && responseData.current) {
    const current = responseData.current;
    const precipitationRate = typeof current.precipitation === 'number' ? current.precipitation : 0;
    
    // Hourly forecast aggregate for the next 6 hours starting at observation hour
    const next6HoursExpectedTotalMm = calculateNext6HourForecast(responseData.hourly, current.time);

    const successPayload = {
      status: 'success',
      provider: 'Open-Meteo Meteorological Service',
      providerType: 'live',
      attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
      targetCoordinates: { lat: latitude, lng: longitude },
      observationTimestamp: current.time ? new Date(current.time).toISOString() : nowIso,
      dataFreshnessMinutes: 1,
      isLive: true,
      isCached: false,
      isStale: false,
      measurements: {
        currentRainfall: {
          type: 'Precipitation Rate',
          value: precipitationRate,
          unit: 'mm/h',
          category: categorizeRainfall(precipitationRate),
          isObserved: true,
          description: precipitationRate === 0 ? 'No active precipitation' : `${precipitationRate} mm/h precipitation recorded in current observation interval`
        },
        rainfallForecast6h: {
          type: '6-Hour Forecast Total',
          value: next6HoursExpectedTotalMm,
          unit: 'mm',
          isForecast: true,
          description: 'Projected cumulative precipitation over next 6 hours from meteorological forecast model'
        },
        waterLevelGauge: {
          type: 'Reference River Stage Gauge',
          stationName: VADODARA_REFERENCE_GAUGE.stationName,
          stationCode: VADODARA_REFERENCE_GAUGE.stationCode,
          sensorNetworkAvailable: false,
          isSensorReading: false,
          status: 'benchmark_only',
          warningLevelMeters: VADODARA_REFERENCE_GAUGE.warningLevelMeters,
          dangerLevelMeters: VADODARA_REFERENCE_GAUGE.dangerLevelMeters,
          note: VADODARA_REFERENCE_GAUGE.note
        }
      }
    };

    // Store in cache with current timestamp
    telemetryCache.set(cacheKey, {
      cachedAt: Date.now(),
      data: successPayload
    });

    return successPayload;
  }

  // If request failed (e.g. 429 rate limit or network down), check if we have a prior cached entry to return as STALE
  if (existingCached && existingCached.data) {
    const ageMinutes = Math.max(1, Math.round((Date.now() - existingCached.cachedAt) / 60000));
    return {
      ...existingCached.data,
      status: 'success',
      providerType: providerStatus === 'rate_limited' ? 'rate_limited' : 'stale',
      isLive: false,
      isCached: true,
      isStale: true,
      dataFreshnessMinutes: ageMinutes,
      warning: `Provider rate limit reached (HTTP 429); serving cached telemetry observed at ${existingCached.data.observationTimestamp}`,
      measurements: {
        ...existingCached.data.measurements,
        currentRainfall: {
          ...existingCached.data.measurements.currentRainfall,
          description: `${existingCached.data.measurements.currentRainfall.description} (Cached observation from ${existingCached.data.observationTimestamp})`
        }
      }
    };
  }

  // Graceful fallback when external provider is unreachable / rate-limited / timed out and NO cache exists
  return {
    status: 'fallback',
    provider: 'Open-Meteo Meteorological Service (Offline/Fallback)',
    providerType: providerStatus, // 'unavailable' | 'rate_limited' | 'timeout' | 'malformed'
    failureReason,
    targetCoordinates: { lat: latitude, lng: longitude },
    observationTimestamp: nowIso,
    isLive: false,
    isCached: false,
    isStale: false,
    measurements: {
      currentRainfall: {
        type: 'Precipitation Rate',
        value: null,
        unit: 'mm/h',
        category: 'Unavailable',
        isObserved: false,
        status: providerStatus,
        description: `Live precipitation telemetry currently unavailable (${failureReason || 'Provider unreachable'}).`
      },
      rainfallForecast6h: {
        type: '6-Hour Forecast Total',
        value: null,
        unit: 'mm',
        isForecast: true,
        status: providerStatus,
        description: `6-hour precipitation forecast currently unavailable (${failureReason || 'Provider unreachable'}).`
      },
      waterLevelGauge: {
        type: 'Reference River Stage Gauge',
        stationName: VADODARA_REFERENCE_GAUGE.stationName,
        stationCode: VADODARA_REFERENCE_GAUGE.stationCode,
        sensorNetworkAvailable: false,
        isSensorReading: false,
        status: 'benchmark_only',
        warningLevelMeters: VADODARA_REFERENCE_GAUGE.warningLevelMeters,
        dangerLevelMeters: VADODARA_REFERENCE_GAUGE.dangerLevelMeters,
        note: VADODARA_REFERENCE_GAUGE.note
      }
    }
  };
}

/**
 * Standard meteorological classification of precipitation intensity.
 * @param {number} mmPerHour
 * @returns {string}
 */
export function categorizeRainfall(mmPerHour) {
  if (mmPerHour <= 0) return 'None';
  if (mmPerHour < 2.5) return 'Light';
  if (mmPerHour < 7.6) return 'Moderate';
  if (mmPerHour < 50) return 'Heavy';
  return 'Violent Torrential';
}
