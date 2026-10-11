import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { VADODARA_CENTER } from '../../lib/config';

const mapContainerStyle = { height: '100%', width: '100%', zIndex: 10 };

const pickerIcon = L.divIcon({
  className: 'custom-picker-marker',
  html: `<div style="background-color: #0f172a; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><div style="width: 4px; height: 4px; background: white; border-radius: 50%;"></div></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function MapInteraction({ onLocationSelect, selectedLocation }) {
  const map = useMap();
  
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  // Center map if location is set externally (e.g. typing)
  useEffect(() => {
    if (selectedLocation) {
      map.flyTo([selectedLocation.lat, selectedLocation.lng], map.getZoom());
    }
  }, [selectedLocation, map]);

  return null;
}

export function LocationPickerMap({ selectedLocation, onLocationSelect }) {
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMapLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mapLoaded) return <div className="h-full w-full flex items-center justify-center bg-surface-100 text-brand-700 text-sm">Loading Picker...</div>;

  return (
    <div className="relative h-full w-full bg-surface-100 isolate">
      <MapContainer 
        center={VADODARA_CENTER} 
        zoom={13} 
        style={mapContainerStyle}
        zoomControl={true}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; OSM contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInteraction onLocationSelect={onLocationSelect} selectedLocation={selectedLocation} />
        {selectedLocation && (
          <Marker position={selectedLocation} icon={pickerIcon} />
        )}
      </MapContainer>
      
      {!selectedLocation && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-brand-900 text-white text-xs px-3 py-1.5 rounded-full shadow-md pointer-events-none">
          Click map to set location
        </div>
      )}
    </div>
  );
}
