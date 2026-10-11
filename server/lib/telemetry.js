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
 * Fetches environmental telemetry from Open-Meteo for given coordinates.
 * @param {number} lat
 * @param {number} lng
 * @param {object} [options]
 * @param {Function} [options.fetchFn] Injected fetch implementation for unit testing
 * @returns {Promise<object>} Structured telemetry payload
 */
export async function fetchEnvironmentalTelemetry(lat, lng, options = {}) {
  const coordCheck = validateCoordinates(lat, lng);
  if (!coordCheck.valid) {
    throw new Error(coordCheck.error);
  }

  const latitude = coordCheck.lat;
  const longitude = coordCheck.lng;

  // Check if simulated / offline mode is explicitly requested or if network fails
  const fetchImpl = options.fetchFn || globalThis.fetch;

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
    const rainRate = typeof current.rain === 'number' ? current.rain : 0;
    
    // Hourly forecast aggregate for the next 6 hours
    let next6HoursExpectedTotalMm = 0;
    if (responseData.hourly && Array.isArray(responseData.hourly.precipitation)) {
      const next6 = responseData.hourly.precipitation.slice(0, 6);
      next6HoursExpectedTotalMm = next6.reduce((acc, val) => acc + (typeof val === 'number' ? val : 0), 0);
      next6HoursExpectedTotalMm = Math.round(next6HoursExpectedTotalMm * 10) / 10;
    }

    return {
      status: 'success',
      provider: 'Open-Meteo Meteorological Service',
      providerType: 'live',
      attribution: 'Weather data by Open-Meteo.com (CC BY 4.0)',
      targetCoordinates: { lat: latitude, lng: longitude },
      observationTimestamp: current.time ? new Date(current.time).toISOString() : nowIso,
      dataFreshnessMinutes: 15,
      isLive: true,
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
  }

  // Graceful fallback when external provider is unreachable / rate-limited / timed out
  return {
    status: 'fallback',
    provider: 'Open-Meteo Meteorological Service (Offline/Fallback)',
    providerType: providerStatus, // 'unavailable' | 'rate_limited' | 'timeout' | 'malformed'
    failureReason,
    targetCoordinates: { lat: latitude, lng: longitude },
    observationTimestamp: nowIso,
    isLive: false,
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
