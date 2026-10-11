import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VADODARA_CENTER } from '../../lib/config';
import { Badge } from '../ui/Badge';
import { AlertTriangle, Info, Clock, CheckCircle2, XCircle, Activity } from 'lucide-react';
import { Button } from '../ui/Button';

const mapContainerStyle = { height: '100%', width: '100%', zIndex: 10 };

const severityColors = {
  low: '#14b8a6',       // teal
  medium: '#f59e0b',    // amber
  high: '#f97316',      // orange
  critical: '#dc2626'   // red
};

const createMarkerIcon = (priorityLabel, isStale, isSelected) => {
  const color = severityColors[priorityLabel] || severityColors.low;
  const opacity = isStale && !isSelected ? '0.5' : '1';
  const scale = isSelected ? 'transform: scale(1.3); z-index: 1000;' : '';
  const border = isSelected ? '4px solid white' : '2px solid white';
  
  return L.divIcon({
    className: 'custom-incident-marker',
    html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: ${border}; box-shadow: 0 1px 6px rgba(0,0,0,0.4); opacity: ${opacity}; ${scale} transition: all 0.2s;"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
};

function MapController({ selectedIncident }) {
  const map = useMap();
  
  useEffect(() => {
    if (selectedIncident && selectedIncident.lat && selectedIncident.lng) {
      map.flyTo([selectedIncident.lat, selectedIncident.lng], 16, { animate: true, duration: 1 });
    }
  }, [selectedIncident, map]);
  
  return null;
}

export function IncidentMap({ incidents, onReportClick, selectedIncidentId, onIncidentClick }) {
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const selectedIncident = incidents.find(i => i.id === selectedIncidentId);

  useEffect(() => {
    const timer = setTimeout(() => setMapLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mapLoaded) {
    return <div className="h-full w-full flex items-center justify-center bg-surface-100 text-brand-700">Loading Map Intelligence...</div>;
  }

  return (
    <div className="relative h-full w-full bg-surface-100 rounded overflow-hidden isolate border border-surface-200">
      <MapContainer center={VADODARA_CENTER} zoom={13} style={mapContainerStyle} zoomControl={true} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | SAMPLE DATA'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController selectedIncident={selectedIncident} />
        
        {incidents.map((incident) => {
          if (!incident.lat || !incident.lng) return null;
          const { score = 0, label = 'low', explanation = [], isStale = false } = incident._priority || {};
          const isSelected = incident.id === selectedIncidentId;
          
          return (
            <Marker 
              key={incident.id} 
              position={[incident.lat, incident.lng]} 
              icon={createMarkerIcon(label, isStale, isSelected)}
              eventHandlers={{
                click: () => onIncidentClick && onIncidentClick(incident.id)
              }}
            >
              <Popup className="incident-popup" closeButton={false} autoPanPadding={[20, 20]}>
                <div className="w-64">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-heading font-semibold text-brand-900 leading-tight pr-2">{incident.title}</h4>
                    <Badge variant={label === 'critical' || label === 'high' ? 'danger' : label === 'medium' ? 'warning' : 'success'}>
                      {score} / 100
                    </Badge>
                  </div>
                  
                  <div className="space-y-1.5 mb-3 text-sm text-brand-700">
                    <div className="flex items-center justify-between border-b border-surface-200 pb-1 mb-1 text-xs">
                      <span className="font-medium text-brand-900">Calculated Priority: <span className="capitalize">{label}</span></span>
                      {isStale && <span className="text-accent-red font-medium">STALE</span>}
                    </div>

                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 opacity-70" />
                      <span>Depth: {incident.depth} cm</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity className="w-3.5 h-3.5 opacity-70" />
                      <span>Reported as: <span className="capitalize">{incident.severity}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 opacity-70" />
                      <span>{incident.time}</span>
                    </div>
                    
                    <div className="mt-2 p-2 bg-surface-50 rounded border border-surface-200 text-xs">
                      <span className="font-medium text-brand-900 block mb-1">Scoring Breakdown:</span>
                      <ul className="list-disc pl-4 space-y-0.5 text-brand-700/80">
                        {explanation.map((exp, i) => (
                          <li key={i}>{exp}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {incident.verified ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-accent-teal" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-accent-amber" />
                      )}
                      <span className={incident.verified ? 'text-accent-teal' : 'text-accent-amber'}>
                        {incident.verified ? 'Verified Report' : 'Unverified Report'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="bg-surface-50 -mx-4 -mb-3 px-4 py-2 border-t border-surface-200 text-xs text-brand-700/60 flex justify-between">
                    <span>ID: {incident.id.replace('sample-', '#').replace('rep-', '#')}</span>
                    <span className="font-medium text-accent-red tracking-wider uppercase">
                      {incident.isSample ? 'Sample Data' : 'Live Report'}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {!selectedIncidentId && (
        <div className="absolute bottom-4 right-4 z-[400] bg-white p-3 rounded shadow-sm border border-surface-200 text-xs">
          <h5 className="font-medium text-brand-900 mb-2 uppercase tracking-wide">Sys. Priority</h5>
          <ul className="space-y-1.5">
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-accent-teal border border-surface-100"></span> Low</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-accent-amber border border-surface-100"></span> Medium</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-orange-500 border border-surface-100"></span> High</li>
            <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-accent-red border border-surface-100"></span> Critical</li>
          </ul>
        </div>
      )}

      {onReportClick && (
        <div className="absolute top-4 right-4 z-[400]">
           <Button onClick={onReportClick} className="shadow-md">
             Report Waterlogging
           </Button>
        </div>
      )}
    </div>
  );
}
