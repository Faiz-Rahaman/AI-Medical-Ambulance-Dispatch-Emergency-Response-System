import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';

const containerStyle = {
  width: '100%',
  height: '260px',
};

const GoogleMapPicker = ({ latitude, longitude, onLocationChange }) => {
  const mapRef = useRef(null);
  const [currentCoords, setCurrentCoords] = useState({
    lat: latitude || 12.9675,
    lng: longitude || 80.1491,
  });

  // Keep internal coordinates in sync when props change (from preset, search, or parent)
  useEffect(() => {
    if (latitude && longitude) {
      const newPos = { lat: Number(latitude), lng: Number(longitude) };
      setCurrentCoords(newPos);
      if (mapRef.current) {
        mapRef.current.panTo(newPos);
      }
    }
  }, [latitude, longitude]);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (latitude && longitude) {
      map.panTo({ lat: Number(latitude), lng: Number(longitude) });
    }
  }, [latitude, longitude]);

  const reverseGeocodeAndNotify = useCallback((lat, lng) => {
    setCurrentCoords({ lat, lng });

    if (window.google?.maps?.Geocoder) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results?.[0]) {
          onLocationChange(lat, lng, results[0].formatted_address);
        } else {
          onLocationChange(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }
      });
    } else {
      onLocationChange(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, [onLocationChange]);

  const handleMapClick = useCallback((e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    reverseGeocodeAndNotify(lat, lng);
  }, [reverseGeocodeAndNotify]);

  const handleMarkerDragEnd = useCallback((e) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    reverseGeocodeAndNotify(lat, lng);
  }, [reverseGeocodeAndNotify]);

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    fullscreenControl: true,
    streetViewControl: false,
    mapTypeControl: false,
    clickableIcons: false,
    gestureHandling: 'greedy',
    styles: [
      { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
    ],
  };

  const markerIcon = window.google?.maps ? {
    path: window.google.maps.SymbolPath?.CIRCLE ?? 0,
    fillColor: '#E53935',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 3,
    scale: 14,
  } : undefined;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={currentCoords}
        zoom={15}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        options={mapOptions}
      >
        {markerIcon && (
          <Marker
            position={currentCoords}
            icon={markerIcon}
            label={{ text: '📍', fontSize: '18px' }}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
            title="Drag marker to your exact location"
          />
        )}
      </GoogleMap>

      {/* Floating Info Overlay */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
          background: 'rgba(20, 24, 33, 0.88)',
          color: '#ffffff',
          borderRadius: '8px',
          padding: '6px 12px',
          fontSize: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
          pointerEvents: 'none',
        }}
      >
        <div>
          <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✓ Pinned: </span>
          <span>{currentCoords.lat.toFixed(5)}, {currentCoords.lng.toFixed(5)}</span>
        </div>
        <div style={{ fontSize: '11px', color: '#cbd5e1' }}>
          🖱️ Click map or drag pin to adjust
        </div>
      </div>
    </div>
  );
};

export default GoogleMapPicker;
