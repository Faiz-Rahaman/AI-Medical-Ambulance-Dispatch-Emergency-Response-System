import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';

// Defined outside the component so the reference stays stable across renders.
// A changing `libraries` reference is a common cause of reload/"Script error." issues.
const libraries = ['geometry'];

const mapContainerStyle = {
  width: '100%',
  height: '350px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
};

const GoogleMapsRoute = ({
  patientLat,
  patientLon,
  ambulanceLat,
  ambulanceLon,
  routeData,
  ambulanceInfo,
  className = "w-full h-96 rounded-lg"
}) => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [routePath, setRoutePath] = useState(null);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  // Get API key with fallback
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyBIcmRu-yA62s2Js4RtyJfsFKf9Rm-Xp6w';

  // Load the Google Maps script ONCE via the hook. Unlike <LoadScript>, this does
  // not re-inject the script when the component re-mounts (e.g. opening the sidebar),
  // which avoids the cross-origin "Script error." runtime overlay.
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries
  });

  const center = {
    lat: patientLat || 13.0827,
    lng: patientLon || 80.2707
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: true,
    mapTypeControl: true,
    fullscreenControl: true,
    rotateControl: true,
    scaleControl: true,
    clickableIcons: true,
    gestureHandling: 'greedy',
    styles: [
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#f5f5f5' }, { weight: 1 }] },
      { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'simplified' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c9c9c9' }] },
      { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#e8f5e9' }] }
    ]
  };

  const patientMarkerIcon = isLoaded && window.google?.maps ? {
    path: (window.google.maps.SymbolPath && window.google.maps.SymbolPath.CIRCLE !== undefined)
      ? window.google.maps.SymbolPath.CIRCLE
      : 0,
    fillColor: '#FF1744',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 3,
    scale: 15
  } : undefined;

  const ambulanceMarkerIcon = isLoaded && window.google?.maps ? {
    path: (window.google.maps.SymbolPath && window.google.maps.SymbolPath.CIRCLE !== undefined)
      ? window.google.maps.SymbolPath.CIRCLE
      : 0,
    fillColor: '#00C853',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 3,
    scale: 15
  } : undefined;

  const userMarkerIcon = isLoaded && window.google?.maps ? {
    path: (window.google.maps.SymbolPath && window.google.maps.SymbolPath.CIRCLE !== undefined)
      ? window.google.maps.SymbolPath.CIRCLE
      : 0,
    fillColor: '#2196F3',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 3,
    scale: 12
  } : undefined;

  // Decode the encoded polyline from the Google Directions API into road-following points.
  useEffect(() => {
    if (!isLoaded || !window.google?.maps?.geometry?.encoding) return;
    if (!routeData) return;

    try {
      if (routeData.polyline && routeData.polyline.trim()) {
        const decoded = window.google.maps.geometry.encoding
          .decodePath(routeData.polyline)
          .map((point) => ({ lat: point.lat(), lng: point.lng() }));
        console.log(`Decoded road polyline with ${decoded.length} points`);
        setRoutePath(decoded);
      } else {
        console.log('No valid polyline data, will show straight line connection');
        setRoutePath(null);
      }
    } catch (err) {
      console.error('Error processing route data:', err);
      setError('Error displaying route: ' + err.message);
      setRoutePath(null);
    }
  }, [isLoaded, routeData, patientLat, patientLon, ambulanceLat, ambulanceLon]);

  // Auto-zoom/pan the map to fit the whole route (like phone navigation).
  useEffect(() => {
    if (!map || !window.google) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoint = false;

    if (routePath && routePath.length > 0) {
      routePath.forEach((point) => {
        bounds.extend(point);
        hasPoint = true;
      });
    } else {
      if (patientLat && patientLon) {
        bounds.extend({ lat: patientLat, lng: patientLon });
        hasPoint = true;
      }
      if (ambulanceLat && ambulanceLon) {
        bounds.extend({ lat: ambulanceLat, lng: ambulanceLon });
        hasPoint = true;
      }
    }

    if (hasPoint) {
      map.fitBounds(bounds, 60);
    }
  }, [map, routePath, patientLat, patientLon, ambulanceLat, ambulanceLon]);

  const onLoad = (mapInstance) => {
    setMap(mapInstance);
    mapRef.current = mapInstance;
  };

  const onUnmount = () => {
    setMap(null);
    mapRef.current = null;
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by this browser.');
      return;
    }

    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        setUserLocation({ lat: userLat, lng: userLng });

        if (map) {
          map.panTo({ lat: userLat, lng: userLng });
          map.setZoom(15);
        }

        setIsLocating(false);
        console.log('User location found:', { lat: userLat, lng: userLng });
      },
      (geoError) => {
        setIsLocating(false);
        let errorMessage = 'Unable to retrieve your location. ';

        switch (geoError.code) {
          case geoError.PERMISSION_DENIED:
            errorMessage += 'Please allow location access to use this feature.';
            break;
          case geoError.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case geoError.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }

        setError(errorMessage);
        console.error('Geolocation error:', geoError);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  // Missing/placeholder API key
  if (!apiKey || apiKey === 'YOUR_API_KEY_HERE') {
    return (
      <div className={`${className} flex items-center justify-center bg-yellow-50 border border-yellow-200 rounded-lg`}>
        <div className="text-center text-yellow-600">
          <p className="font-semibold">⚠️ Google Maps API Key Required</p>
          <p className="text-sm">Please set REACT_APP_GOOGLE_MAPS_API_KEY in your .env file</p>
        </div>
      </div>
    );
  }

  // Script failed to load
  if (loadError) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded-lg`}>
        <div className="text-center text-red-600">
          <p className="font-semibold">Map Error</p>
          <p className="text-sm">Failed to load Google Maps. Check your API key and network.</p>
        </div>
      </div>
    );
  }

  // Non-fatal route error
  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-red-50 border border-red-200 rounded-lg`}>
        <div className="text-center text-red-600">
          <p className="font-semibold">Map Error</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-xl p-3 shadow-lg border border-gray-100">
      <div className="mb-3">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <span className="mr-2">🗺️</span>
          Route Tracking
        </h2>
        <p className="text-gray-600 text-xs mt-1">Ambulance route with live traffic</p>
      </div>

      {!isLoaded ? (
        <div className="bg-gray-100 rounded-xl flex items-center justify-center" style={{ height: '350px' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={12}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          {/* Patient Marker */}
          {patientLat && patientLon && isLoaded && patientMarkerIcon && (
            <Marker
              position={{ lat: patientLat, lng: patientLon }}
              title="Patient Location"
              icon={patientMarkerIcon}
              label={{ text: 'P', color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}
            />
          )}

          {/* Ambulance Marker */}
          {ambulanceLat && ambulanceLon && isLoaded && ambulanceMarkerIcon && (
            <Marker
              position={{ lat: ambulanceLat, lng: ambulanceLon }}
              title={`Ambulance: ${ambulanceInfo?.vehicle_number || 'Unknown'}`}
              icon={ambulanceMarkerIcon}
              label={{ text: 'A', color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}
            />
          )}

          {/* User Location Marker */}
          {userLocation && isLoaded && userMarkerIcon && (
            <Marker
              position={userLocation}
              title="Your Location"
              icon={userMarkerIcon}
              label={{ text: 'U', color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}
            />
          )}

          {/* Real road route drawn from the decoded Google Directions polyline */}
          {routePath && routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#4285F4',
                strokeWeight: 6,
                strokeOpacity: 1.0,
                geodesic: false
              }}
            />
          )}

          {/* Fallback: straight line only if no road polyline is available */}
          {(!routePath || routePath.length === 0) && patientLat && patientLon && ambulanceLat && ambulanceLon && (
            <Polyline
              path={[
                { lat: patientLat, lng: patientLon },
                { lat: ambulanceLat, lng: ambulanceLon }
              ]}
              options={{
                strokeColor: '#9CA3AF',
                strokeWeight: 4,
                strokeOpacity: 0.8,
                geodesic: true
              }}
            />
          )}
        </GoogleMap>
      )}

      {/* Map Control Buttons */}
      {isLoaded && (
        <div className="absolute bottom-3 left-3 flex flex-col space-y-2">
          {/* Traffic Button */}
          <button
            onClick={() => {
              if (map) {
                const trafficLayer = new window.google.maps.TrafficLayer();
                trafficLayer.setMap(map);
              }
            }}
            className="bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg shadow-lg border border-gray-200 flex items-center space-x-2 transition-all duration-200 font-medium text-sm"
          >
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
            <span>Traffic</span>
          </button>

          {/* Location Pin Button */}
          <button
            onClick={getCurrentLocation}
            disabled={isLocating}
            className="bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg shadow-lg border border-gray-200 flex items-center space-x-2 transition-all duration-200 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Find my location"
          >
            {isLocating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                <span>Finding...</span>
              </>
            ) : (
              <span>My Location</span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleMapsRoute;
