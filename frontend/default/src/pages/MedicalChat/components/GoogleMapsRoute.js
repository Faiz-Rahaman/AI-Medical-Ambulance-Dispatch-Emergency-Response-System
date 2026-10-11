import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from '@react-google-maps/api';

// Defined outside the component so the reference stays stable across renders.
const libraries = ['geometry', 'places'];

const mapContainerStyle = {
  width: '100%',
  height: '450px',
  borderRadius: '12px',
  border: '1px solid #e5e7eb',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)'
};

/* ──────────────────────────────────────────────────────
   Helper: interpolate between two LatLng objects
   ────────────────────────────────────────────────────── */
function interpolate(from, to, fraction) {
  const lat = from.lat() + (to.lat() - from.lat()) * fraction;
  const lng = from.lng() + (to.lng() - from.lng()) * fraction;
  return { lat, lng };
}

/* ──────────────────────────────────────────────────────
   Helper: compute bearing between two lat/lng for icon rotation
   ────────────────────────────────────────────────────── */
function computeHeading(from, to) {
  if (!window.google?.maps?.geometry?.spherical) return 0;
  return window.google.maps.geometry.spherical.computeHeading(from, to);
}

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
  const [directionsResult, setDirectionsResult] = useState(null);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [trafficLayerActive, setTrafficLayerActive] = useState(false);
  const trafficLayerRef = useRef(null);

  /* ── Animated ambulance simulation state ── */
  const [animatedPos, setAnimatedPos] = useState(null);
  const [animationProgress, setAnimationProgress] = useState(0);
  const [animHeading, setAnimHeading] = useState(0);
  const animFrameRef = useRef(null);
  const routePathRef = useRef([]);        // decoded lat/lngs along the route
  const segmentIndexRef = useRef(0);      // which segment the ambulance is on
  const segmentFractionRef = useRef(0);   // fraction along current segment
  const animActiveRef = useRef(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [simulatedSpeed, setSimulatedSpeed] = useState(0);
  const prevTimestampRef = useRef(null);

  // Get API key with fallback
  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyBIcmRu-yA62s2Js4RtyJfsFKf9Rm-Xp6w';

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries
  });

  // Stable initial center to prevent GoogleMap from resetting viewport on every frame
  const initialCenter = useMemo(() => ({
    lat: patientLat || 13.0827,
    lng: patientLon || 80.2707
  }), [patientLat, patientLon]);

  // Google Maps clean style - memoized with full drag & zoom capabilities
  const mapOptions = useMemo(() => ({
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: true,
    rotateControl: true,
    scaleControl: true,
    clickableIcons: false,
    gestureHandling: 'greedy',
    draggable: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    styles: [
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
      { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#e8ecf1' }] },
      { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#c9d2e0' }] },
      { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#f0f2f5' }] },
      { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#f8f9fa' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#c8e6f8' }] },
      { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#eef3e8' }] },
    ]
  }), []);

  // ---------- Client-side Directions (road-following blue route) ----------
  const fetchClientDirections = useCallback(() => {
    if (!isLoaded || !window.google?.maps) return;
    if (!patientLat || !patientLon || !ambulanceLat || !ambulanceLon) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: { lat: ambulanceLat, lng: ambulanceLon },
        destination: { lat: patientLat, lng: patientLon },
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === 'OK') {
          console.log('[GoogleMapsRoute] Client-side Directions OK');
          setDirectionsResult(result);
          setError(null);

          // Extract the overview path for animation
          const path = result.routes[0]?.overview_path;
          if (path && path.length > 1) {
            routePathRef.current = path;
            // Start animation from a partially completed position (looks more realistic for demo)
            const startPercent = Math.random() * 0.15 + 0.25; // 25%-40% already done
            const startIdx = Math.floor(path.length * startPercent);
            segmentIndexRef.current = startIdx;
            segmentFractionRef.current = 0;
            const startPt = path[startIdx];
            setAnimatedPos({ lat: startPt.lat(), lng: startPt.lng() });
            setAnimationProgress(Math.round(startPercent * 100));
          }
        } else {
          console.warn('[GoogleMapsRoute] Client-side Directions failed:', status);
          setDirectionsResult(null);
        }
      }
    );
  }, [isLoaded, patientLat, patientLon, ambulanceLat, ambulanceLon]);

  useEffect(() => {
    fetchClientDirections();
  }, [fetchClientDirections]);

  /* ──────────────────────────────────────────────────────
     AMBULANCE ANIMATION ENGINE
     Moves the ambulance marker step-by-step along the decoded route.
     Uses requestAnimationFrame for silky-smooth movement.
     ────────────────────────────────────────────────────── */
  const startAnimation = useCallback(() => {
    if (routePathRef.current.length < 2) return;
    animActiveRef.current = true;
    setIsAnimating(true);
    prevTimestampRef.current = null;

    // Speed: pixels-per-second equivalent → we move through segments over time
    // Adjust SPEED_FACTOR to control how fast the ambulance moves on screen
    const SPEED_FACTOR = 0.00035; // fraction of a segment per ms

    const animate = (timestamp) => {
      if (!animActiveRef.current) return;

      if (prevTimestampRef.current === null) {
        prevTimestampRef.current = timestamp;
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const delta = timestamp - prevTimestampRef.current;
      prevTimestampRef.current = timestamp;

      const path = routePathRef.current;
      let idx = segmentIndexRef.current;
      let frac = segmentFractionRef.current;

      // Advance fraction with natural vehicle deceleration near arrival
      const totalSegments = Math.max(1, path.length - 1);
      const estRatio = (idx + frac) / totalSegments;
      // Vehicle visually slows down as it pulls up and parks (from 85% to 100%)
      const moveFactor = estRatio >= 0.85 ? Math.max(0.45, Math.pow((1.0 - estRatio) / 0.15, 0.6)) : 1.0;
      frac += delta * SPEED_FACTOR * moveFactor;

      // Move to next segment(s) if fraction >= 1
      while (frac >= 1 && idx < path.length - 1) {
        frac -= 1;
        idx += 1;
      }

      // Reached or passed destination
      if (idx >= path.length - 1) {
        idx = path.length - 1;
        frac = 0;
        segmentIndexRef.current = idx;
        segmentFractionRef.current = 0;
        const endPt = path[idx];
        setAnimatedPos({ lat: endPt.lat(), lng: endPt.lng() });
        setAnimationProgress(100);
        setSimulatedSpeed(0);
        animActiveRef.current = false;
        setIsAnimating(false);
        return;
      }

      segmentIndexRef.current = idx;
      segmentFractionRef.current = frac;

      const from = path[idx];
      const to = path[idx + 1];
      if (!from || !to) {
        setAnimationProgress(100);
        setSimulatedSpeed(0);
        animActiveRef.current = false;
        setIsAnimating(false);
        return;
      }

      const pos = interpolate(from, to, Math.min(frac, 1));
      const heading = computeHeading(from, to);

      setAnimatedPos(pos);
      setAnimHeading(heading);

      // Precise progress percentage
      const currentProgressRatio = Math.min((idx + frac) / totalSegments, 1.0);
      const progress = Math.min(Math.round(currentProgressRatio * 100), 100);
      setAnimationProgress(progress);

      // Smooth realistic deceleration curve:
      // • Below 75%: Cruising speed (48 - 68 km/h)
      // • 75% to 99%: Smoothly decelerates (55 -> 42 -> 28 -> 15 -> 6 -> 2 -> 1 km/h)
      // • 100%: 0 km/h
      if (progress >= 100) {
        setSimulatedSpeed(0);
        animActiveRef.current = false;
        setIsAnimating(false);
        return;
      } else if (currentProgressRatio >= 0.75) {
        const remainingRatio = Math.max(0, (1.0 - currentProgressRatio) / 0.25); // 1.0 down to 0.0
        const decelCurve = Math.pow(remainingRatio, 1.25); // smooth ease-out curve
        const baseCruising = 55 + Math.sin(timestamp / 2000) * 8;
        const decelSpeed = Math.max(1, Math.round(baseCruising * decelCurve));
        setSimulatedSpeed(decelSpeed);
      } else {
        const baseSpeed = 55 + Math.sin(timestamp / 2000) * 15;
        setSimulatedSpeed(Math.round(baseSpeed));
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, []);

  const stopAnimation = useCallback(() => {
    animActiveRef.current = false;
    setIsAnimating(false);
    setSimulatedSpeed(0);
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
  }, []);

  // Auto-start animation once directions are loaded
  useEffect(() => {
    if (directionsResult && routePathRef.current.length > 1 && !animActiveRef.current) {
      // Small delay so user can see the route first
      const timer = setTimeout(() => startAnimation(), 1200);
      return () => clearTimeout(timer);
    }
  }, [directionsResult, startAnimation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      animActiveRef.current = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const boundsFittedRef = useRef(false);
  useEffect(() => {
    if (!map || !window.google) return;
    if (directionsResult?.routes?.[0]?.bounds && !boundsFittedRef.current) {
      map.fitBounds(directionsResult.routes[0].bounds, 40);
      boundsFittedRef.current = true;
    } else if (!directionsResult) {
      const bounds = new window.google.maps.LatLngBounds();
      let hasPoint = false;
      if (patientLat && patientLon) {
        bounds.extend({ lat: patientLat, lng: patientLon });
        hasPoint = true;
      }
      if (ambulanceLat && ambulanceLon) {
        bounds.extend({ lat: ambulanceLat, lng: ambulanceLon });
        hasPoint = true;
      }
      if (hasPoint) {
        map.fitBounds(bounds, 60);
      }
    }
  }, [map, directionsResult, patientLat, patientLon, ambulanceLat, ambulanceLon]);

  const onLoad = (mapInstance) => {
    setMap(mapInstance);
    mapRef.current = mapInstance;
  };

  const onUnmount = () => {
    setMap(null);
    mapRef.current = null;
  };

  const toggleTrafficLayer = () => {
    if (!map || !window.google?.maps) return;

    if (trafficLayerActive && trafficLayerRef.current) {
      trafficLayerRef.current.setMap(null);
      trafficLayerRef.current = null;
      setTrafficLayerActive(false);
    } else {
      const layer = new window.google.maps.TrafficLayer();
      layer.setMap(map);
      trafficLayerRef.current = layer;
      setTrafficLayerActive(true);
    }
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

  // ---- Marker icons ----
  const patientMarkerIcon = isLoaded && window.google?.maps ? {
    path: window.google.maps.SymbolPath?.CIRCLE ?? 0,
    fillColor: '#FF1744',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 3,
    scale: 15
  } : undefined;

  // Ambulance marker — use a forward-arrow SVG path that rotates with heading
  const ambulanceAnimatedIcon = isLoaded && window.google?.maps ? {
    path: 'M -1,-3 L 0,-4 L 1,-3 L 1,3 L 0,4 L -1,3 Z', // diamond/arrow shape
    fillColor: '#00C853',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 2.5,
    scale: 5,
    rotation: animHeading,
    anchor: window.google.maps.Point ? new window.google.maps.Point(0, 0) : undefined,
  } : undefined;

  // Static ambulance marker (origin)
  const ambulanceMarkerIcon = isLoaded && window.google?.maps ? {
    path: window.google.maps.SymbolPath?.CIRCLE ?? 0,
    fillColor: '#00C853',
    fillOpacity: 0.4,
    strokeColor: '#00C853',
    strokeWeight: 2,
    scale: 10
  } : undefined;

  const userMarkerIcon = isLoaded && window.google?.maps ? {
    path: window.google.maps.SymbolPath?.CIRCLE ?? 0,
    fillColor: '#2196F3',
    fillOpacity: 1,
    strokeColor: '#FFFFFF',
    strokeWeight: 3,
    scale: 12
  } : undefined;

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

  // Custom DirectionsRenderer options for the Google Maps blue route look
  // preserveViewport: true prevents DirectionsRenderer from resetting zoom/pan on every animation frame!
  const directionsOptions = useMemo(() => ({
    suppressMarkers: true, // We draw our own custom markers
    preserveViewport: true, // CRITICAL: Allows user to freely pan/zoom without snapping back during tracking
    polylineOptions: {
      strokeColor: '#4285F4',     // Google Maps signature blue
      strokeWeight: 6,
      strokeOpacity: 0.9,
    },
  }), []);

  // Estimated remaining time
  const etaMinutes = animationProgress < 100
    ? Math.max(1, Math.round((100 - animationProgress) / 100 * (routeData?.duration_seconds ? routeData.duration_seconds / 60 : 8)))
    : 0;

  // Actual speed to display: 0 when arrived or paused
  const displaySpeed = animationProgress >= 100 || !isAnimating ? 0 : simulatedSpeed;

  return (
    <div className="relative bg-white rounded-xl p-3 shadow-lg border border-gray-100">
      {/* ── Live Tracking HUD ── */}
      <div className="mb-3">
        <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 flex items-center mb-0" style={{ fontSize: '16px', fontWeight: 600 }}>
              <span className="mr-2">🗺️</span>
              Live Route Tracking
              {isAnimating && (
                <span className="ms-2 badge bg-danger" style={{
                  fontSize: '10px',
                  animation: 'pulse 1.5s infinite',
                  verticalAlign: 'middle'
                }}>
                  ● LIVE
                </span>
              )}
            </h2>
            <p className="text-gray-600 text-xs mt-1 mb-0" style={{ fontSize: '12px', color: '#6b7280' }}>
              Ambulance route with real-time position tracking
            </p>
          </div>

          {/* Tracking metrics */}
          {animatedPos && (
            <div className="d-flex gap-3 align-items-center">
              <div className="text-center">
                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Progress</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: '#4285F4' }}>{animationProgress}%</div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Speed</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: displaySpeed === 0 ? '#6b7280' : '#00C853' }}>
                  {displaySpeed} <span style={{ fontSize: '10px', fontWeight: 400 }}>km/h</span>
                </div>
              </div>
              <div className="text-center">
                <div style={{ fontSize: '10px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>ETA</div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: animationProgress >= 100 ? '#00C853' : '#FF6D00' }}>
                  {animationProgress >= 100 ? 'Arrived' : `${etaMinutes} min`}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {animatedPos && (
          <div style={{
            marginTop: '8px',
            height: '4px',
            background: '#e5e7eb',
            borderRadius: '4px',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <div style={{
              width: `${animationProgress}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4285F4, #00C853)',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }} />
          </div>
        )}
      </div>

      {!isLoaded ? (
        <div className="bg-gray-100 rounded-xl flex items-center justify-center" style={{ height: '450px' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">Loading map...</p>
          </div>
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={initialCenter}
          zoom={12}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={mapOptions}
        >
          {/* ---- Google Maps Blue Road Route via DirectionsRenderer ---- */}
          {directionsResult && (
            <DirectionsRenderer
              directions={directionsResult}
              options={directionsOptions}
            />
          )}

          {/* Patient Marker (red) — destination */}
          {patientLat && patientLon && isLoaded && patientMarkerIcon && (
            <Marker
              position={{ lat: patientLat, lng: patientLon }}
              title="Patient Location"
              icon={patientMarkerIcon}
              label={{ text: 'P', color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}
            />
          )}

          {/* Ambulance Origin Marker (faded green circle) — departure point */}
          {ambulanceLat && ambulanceLon && isLoaded && ambulanceMarkerIcon && (
            <Marker
              position={{ lat: ambulanceLat, lng: ambulanceLon }}
              title={`Ambulance Start: ${ambulanceInfo?.vehicle_number || 'Unknown'}`}
              icon={ambulanceMarkerIcon}
              label={{ text: 'S', color: '#00C853', fontSize: '10px', fontWeight: 'bold' }}
            />
          )}

          {/* ★ ANIMATED AMBULANCE MARKER — moves along route ★ */}
          {animatedPos && isLoaded && ambulanceAnimatedIcon && (
            <Marker
              position={animatedPos}
              title={`🚑 ${ambulanceInfo?.vehicle_number || 'Ambulance'} — ${displaySpeed} km/h`}
              icon={ambulanceAnimatedIcon}
              label={{ text: '🚑', fontSize: '18px' }}
              zIndex={999}
            />
          )}

          {/* User Location Marker (blue) */}
          {userLocation && isLoaded && userMarkerIcon && (
            <Marker
              position={userLocation}
              title="Your Location"
              icon={userMarkerIcon}
              label={{ text: 'U', color: '#FFFFFF', fontSize: '12px', fontWeight: 'bold' }}
            />
          )}
        </GoogleMap>
      )}

      {/* Map Control Buttons */}
      {isLoaded && (
        <div className="d-flex gap-2 mt-2 flex-wrap align-items-center">
          {/* Traffic Toggle */}
          <button
            onClick={toggleTrafficLayer}
            className={`btn btn-sm ${trafficLayerActive ? 'btn-primary' : 'btn-outline-secondary'} d-flex align-items-center gap-1`}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#eab308', display: 'inline-block' }}></span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
            <span className="ms-1">Traffic</span>
          </button>

          {/* Recenter View */}
          <button
            onClick={() => {
              if (map && directionsResult?.routes?.[0]?.bounds) {
                map.fitBounds(directionsResult.routes[0].bounds, 40);
              } else if (map && animatedPos) {
                map.panTo(animatedPos);
                map.setZoom(14);
              }
            }}
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            title="Recenter view on route"
          >
            <i className="ri-focus-3-line"></i> Recenter Route
          </button>

          {/* My Location */}
          <button
            onClick={getCurrentLocation}
            disabled={isLocating}
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            title="Find my location"
          >
            {isLocating ? (
              <>
                <div className="spinner-border spinner-border-sm" role="status"></div>
                <span>Finding...</span>
              </>
            ) : (
              <span>📍 My Location</span>
            )}
          </button>

          {/* Play / Pause Simulation */}
          <button
            onClick={() => {
              if (isAnimating) {
                stopAnimation();
              } else {
                startAnimation();
              }
            }}
            className={`btn btn-sm ${isAnimating ? 'btn-warning' : 'btn-success'} d-flex align-items-center gap-1`}
            disabled={routePathRef.current.length < 2}
          >
            {isAnimating ? (
              <><i className="ri-pause-circle-line"></i> Pause Tracking</>
            ) : (
              <><i className="ri-play-circle-line"></i> Resume Tracking</>
            )}
          </button>

          {/* Reset to start */}
          <button
            onClick={() => {
              stopAnimation();
              const path = routePathRef.current;
              if (path.length > 1) {
                segmentIndexRef.current = 0;
                segmentFractionRef.current = 0;
                const pt = path[0];
                setAnimatedPos({ lat: pt.lat(), lng: pt.lng() });
                setAnimationProgress(0);
                setSimulatedSpeed(0);
                if (map && directionsResult?.routes?.[0]?.bounds) {
                  map.fitBounds(directionsResult.routes[0].bounds, 40);
                }
                setTimeout(() => startAnimation(), 400);
              }
            }}
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            disabled={routePathRef.current.length < 2}
          >
            <i className="ri-restart-line"></i> Restart Demo
          </button>
        </div>
      )}

      {/* Pulse animation CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default GoogleMapsRoute;
