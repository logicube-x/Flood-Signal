import React, { useState, useEffect } from 'react';
import { CloudRain, Droplets, RefreshCw, AlertCircle, CheckCircle2, Info, Compass } from 'lucide-react';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { fetchRainfallTelemetry } from '../lib/api';

export function EnvironmentalContextWidget({ coords = { lat: 22.3072, lng: 73.1812 } }) {
  const [telemetry, setTelemetry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const fetchTelemetry = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const queryLat = coords.lat || 22.3072;
      const queryLng = coords.lng || 73.1812;
      const data = await fetchRainfallTelemetry(queryLat, queryLng);
      setTelemetry(data);
    } catch (err) {
      setError(err.message || 'Unable to retrieve environmental telemetry');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [coords.lat, coords.lng]);

  const rainfall = telemetry?.measurements?.currentRainfall;
  const forecast6h = telemetry?.measurements?.rainfallForecast6h;
  const waterGauge = telemetry?.measurements?.waterLevelGauge;
  const isLive = telemetry?.isLive;

  return (
    <div className="bg-white border border-surface-200 shadow-sm p-4 text-brand-900 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-surface-200 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <CloudRain className="w-4 h-4 text-accent-teal" />
          <h4 className="text-xs font-semibold text-brand-900 tracking-wider uppercase font-sans">
            Environmental Context
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {loading ? (
            <Badge variant="default" className="text-[9px]">Connecting...</Badge>
          ) : isLive ? (
            <Badge variant="success" className="text-[9px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse"></span>
              Live Telemetry
            </Badge>
          ) : (
            <Badge variant="warning" className="text-[9px]">
              Offline Fallback
            </Badge>
          )}

          <button
            onClick={() => fetchTelemetry(true)}
            disabled={loading || refreshing}
            title="Refresh environmental data"
            className="text-brand-500 hover:text-brand-900 transition-colors p-1 disabled:opacity-40"
            aria-label="Refresh telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-accent-teal' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      {loading && !telemetry ? (
        <div className="py-6 flex flex-col items-center justify-center text-brand-500 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-accent-teal" />
          <span className="text-xs">Connecting to meteorological telemetry...</span>
        </div>
      ) : error ? (
        <div className="p-3 bg-accent-red/5 border border-accent-red/20 rounded-sm text-xs text-brand-800 space-y-2">
          <div className="flex items-center gap-1.5 text-accent-red font-medium">
            <AlertCircle className="w-4 h-4" />
            <span>Telemetry Service Offline</span>
          </div>
          <p className="text-[11px] text-brand-600">{error}</p>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchTelemetry(true)}
            className="text-xs py-1"
          >
            Retry Connection
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Rainfall Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Precipitation Rate */}
            <div className="p-2.5 bg-surface-50 border border-surface-200 rounded-sm flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider flex items-center gap-1">
                <Droplets className="w-3 h-3 text-accent-teal" /> Current Rain Rate
              </span>
              <div className="mt-1">
                {rainfall?.value !== null && rainfall?.value !== undefined ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-editorial font-bold text-brand-900">
                      {rainfall.value}
                    </span>
                    <span className="text-[10px] font-semibold text-brand-600 uppercase">
                      {rainfall.unit}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-brand-500 font-medium italic">Unavailable</span>
                )}
                <div className="text-[10px] text-brand-600 mt-0.5">
                  Category: <span className="font-semibold text-brand-800">{rainfall?.category || 'None'}</span>
                </div>
              </div>
            </div>

            {/* 6h Forecast */}
            <div className="p-2.5 bg-surface-50 border border-surface-200 rounded-sm flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-brand-500 uppercase tracking-wider flex items-center gap-1">
                <CloudRain className="w-3 h-3 text-brand-500" /> 6h Forecast
              </span>
              <div className="mt-1">
                {forecast6h?.value !== null && forecast6h?.value !== undefined ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-editorial font-bold text-brand-900">
                      {forecast6h.value}
                    </span>
                    <span className="text-[10px] font-semibold text-brand-600 uppercase">
                      {forecast6h.unit}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-brand-500 font-medium italic">Unavailable</span>
                )}
                <div className="text-[10px] text-brand-500 mt-0.5">
                  Model Projection
                </div>
              </div>
            </div>
          </div>

          {/* River Water-Level Gauge Context */}
          <div className="p-2.5 bg-surface-50/80 border border-surface-200 rounded-sm text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-brand-700 uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3 h-3 text-brand-500" /> Reference River Gauge
              </span>
              <span className="text-[9px] font-medium text-brand-500 bg-surface-200/60 px-1 py-0.5 rounded">
                Benchmark Only
              </span>
            </div>
            <p className="text-[11px] font-medium text-brand-900 leading-tight">
              {waterGauge?.stationName || 'Kalaghoda Bridge Gauge (Vishwamitri River)'}
            </p>
            <div className="flex items-center gap-3 text-[10px] text-brand-600 pt-0.5">
              <span>Warning Level: <strong className="text-accent-amber font-semibold">{waterGauge?.warningLevelMeters} m</strong> (26 ft)</span>
              <span>Danger Level: <strong className="text-accent-red font-semibold">{waterGauge?.dangerLevelMeters} m</strong> (30 ft)</span>
            </div>
            <p className="text-[9px] text-brand-500 italic border-t border-surface-200/60 pt-1 leading-normal">
              {waterGauge?.note}
            </p>
          </div>

          {/* Footer Metadata & Attribution */}
          <div className="pt-1 text-[9px] text-brand-400 flex items-center justify-between border-t border-surface-100">
            <span>Provider: {telemetry?.provider || 'Open-Meteo'}</span>
            <span>
              Updated: {telemetry?.observationTimestamp ? new Date(telemetry.observationTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
