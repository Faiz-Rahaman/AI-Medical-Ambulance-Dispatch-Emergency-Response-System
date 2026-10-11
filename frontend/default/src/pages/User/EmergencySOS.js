import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  Button,
  Spinner,
  Alert,
  Input,
  Label,
  Badge,
  Collapse,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { useNavigate } from "react-router-dom";
import { getLoggedinUser } from "../../helpers/api_helper";
import { useJsApiLoader } from '@react-google-maps/api';
import GoogleMapPicker from './GoogleMapPicker';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
// Must match GoogleMapsRoute.js libraries exactly to prevent '@react-google-maps/api' loader collision
const GMAPS_LIBRARIES = ['geometry', 'places'];

// Standard local reference points (accurately surveyed coordinates)
const LOCATION_PRESETS = [
  { name: "🎓 Amrita College, Vengal", lat: 13.2355, lng: 80.0135, landmark: "Amrita Vishwa Vidyapeetham Campus, Vengal, Tiruvallur" },
  { name: "🏥 Vengal Village PHC", lat: 13.2325, lng: 80.0110, landmark: "Vengal Primary Health Centre, Tiruvallur" },
  { name: "🚑 Thamaraipakkam Koot Road", lat: 13.2160, lng: 80.0410, landmark: "Thamaraipakkam Junction, Vengal Road" },
  { name: "Chromepet / Rela Hospital", lat: 12.9516, lng: 80.1462, landmark: "Rela Hospital / Chromepet, Chennai" },
  { name: "Pallavaram Center", lat: 12.9675, lng: 80.1491, landmark: "GST Road, Pallavaram, Chennai" },
  { name: "Chennai Central", lat: 13.0827, lng: 80.2707, landmark: "Chennai Central / Park Town" },
];

const EmergencySOS = () => {
  document.title = "Emergency SOS | AI Ambulance Dispatch";
  const navigate = useNavigate();

  const user = getLoggedinUser();
  const token = user?.token;

  // Retrieve previously saved location to guarantee consistency across reloads
  const getSavedLocation = () => {
    try {
      const saved = localStorage.getItem("user_emergency_location");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.latitude && parsed.longitude) {
          return {
            latitude: Number(parsed.latitude),
            longitude: Number(parsed.longitude),
            address: parsed.address || "Saved Location",
          };
        }
      }
    } catch (e) {
      console.warn("Could not read saved location:", e);
    }
    // Default starting point: Amrita College Campus, Vengal Village
    return {
      latitude: 13.2355,
      longitude: 80.0135,
      address: "Amrita Vishwa Vidyapeetham Campus, Vengal Village, Tiruvallur",
    };
  };

  const initialLoc = getSavedLocation();
  const [location, setLocation] = useState({ latitude: initialLoc.latitude, longitude: initialLoc.longitude });
  const [address, setAddress] = useState(initialLoc.address);
  const [locating, setLocating] = useState(false);
  const [emergencyType, setEmergencyType] = useState("Cardiac / Heart Emergency");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showManualCoords, setShowManualCoords] = useState(false);
  const [manualLat, setManualLat] = useState(String(initialLoc.latitude));
  const [manualLng, setManualLng] = useState(String(initialLoc.longitude));

  const autocompleteInputRef = useRef(null);
  const autocompleteRef = useRef(null);

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || 'AIzaSyBIcmRu-yA62s2Js4RtyJfsFKf9Rm-Xp6w';

  // Load Google Maps JS API with Places and Geometry libraries
  const { isLoaded: mapsLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: GMAPS_LIBRARIES,
  });

  // Central function to update coordinates, address & persist to localStorage
  const updateLocation = useCallback((lat, lng, newAddress) => {
    const validLat = Number(parseFloat(lat).toFixed(6));
    const validLng = Number(parseFloat(lng).toFixed(6));

    setLocation({ latitude: validLat, longitude: validLng });
    setManualLat(String(validLat));
    setManualLng(String(validLng));

    const finalAddress = newAddress || `${validLat}, ${validLng}`;
    setAddress(finalAddress);

    if (autocompleteInputRef.current) {
      autocompleteInputRef.current.value = finalAddress;
    }

    // Persist to localStorage so location never randomly jumps or resets
    try {
      localStorage.setItem("user_emergency_location", JSON.stringify({
        latitude: validLat,
        longitude: validLng,
        address: finalAddress,
      }));
    } catch (e) {
      console.warn("Failed to store location:", e);
    }
  }, []);

  // Attach Google Places Autocomplete to the search input
  const attachAutocomplete = useCallback(() => {
    if (!mapsLoaded || !window.google?.maps?.places || !autocompleteInputRef.current) return;
    if (autocompleteRef.current) return;

    try {
      const ac = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ['geocode', 'establishment'],
        componentRestrictions: { country: 'in' },
        fields: ['geometry', 'formatted_address', 'name'],
      });

      ac.addListener('place_changed', () => {
        const place = ac.getPlace();
        if (place?.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const placeAddr = place.formatted_address || place.name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          updateLocation(lat, lng, placeAddr);
        }
      });

      autocompleteRef.current = ac;
    } catch (err) {
      console.warn("Autocomplete attach warning:", err);
    }
  }, [mapsLoaded, updateLocation]);

  useEffect(() => {
    attachAutocomplete();
  }, [attachAutocomplete]);

  // Handle Preset Selection
  const selectPresetLocation = (preset) => {
    updateLocation(preset.lat, preset.lng, preset.landmark);
  };

  // Manual Coordinate Input Submission
  const applyManualCoords = () => {
    const latNum = parseFloat(manualLat);
    const lngNum = parseFloat(manualLng);
    if (!isNaN(latNum) && !isNaN(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180) {
      updateLocation(latNum, lngNum, `Coordinates: ${latNum.toFixed(5)}, ${lngNum.toFixed(5)}`);
    } else {
      setErrorMessage("Please enter valid latitude (-90 to 90) and longitude (-180 to 180).");
    }
  };

  // Optional on-demand device GPS detection (NEVER auto-run on page load)
  const detectDeviceGPS = () => {
    setLocating(true);
    setErrorMessage("");

    if (!("geolocation" in navigator)) {
      setErrorMessage("Device geolocation is not supported by your browser.");
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const detectedLat = pos.coords.latitude;
        const detectedLng = pos.coords.longitude;
        updateLocation(detectedLat, detectedLng, `Device GPS (${detectedLat.toFixed(5)}, ${detectedLng.toFixed(5)})`);
        setLocating(false);
      },
      (err) => {
        console.warn("GPS lookup notice:", err);
        setLocating(false);
        setErrorMessage("Could not detect device GPS. Please pick your location on the map or select a quick preset.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        latitude: location.latitude || 12.9516,
        longitude: location.longitude || 80.1462,
        location: address || "Chromepet, Chennai",
        symptoms: `${emergencyType}. ${notes}`.trim(),
        emergency_type: emergencyType.includes("Cardiac") || emergencyType.includes("Accident") ? "Critical" : "Standard",
        contact: contact,
      };

      const res = await fetch(`${API_URL}/user/emergency-sos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to trigger SOS");
      }

      // Redirect directly to live ambulance tracking
      if (data.case_id) {
        navigate(`/user/track?caseId=${data.case_id}`);
      } else {
        navigate("/user/my-cases");
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to dispatch emergency SOS. Please dial 108 immediately!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const presets = [
    { title: "Cardiac / Heart Attack", icon: "ri-heart-pulse-fill", color: "danger" },
    { title: "Severe Trauma / Accident", icon: "ri-car-line", color: "danger" },
    { title: "Breathing Difficulty / Asthma", icon: "ri-lungs-fill", color: "warning" },
    { title: "Stroke / Neurological", icon: "ri-brain-fill", color: "danger" },
    { title: "Severe Burns / Poisoning", icon: "ri-fire-fill", color: "warning" },
    { title: "Pregnancy / Maternity", icon: "ri-empathize-fill", color: "info" },
  ];

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Emergency SOS Dispatch" pageTitle="Citizen Portal" />

        {errorMessage && (
          <Alert color="danger" className="mb-4 d-flex align-items-center justify-content-between">
            <div>
              <i className="ri-alarm-warning-fill me-2 fs-16"></i>
              {errorMessage}
            </div>
            <button type="button" className="btn-close" onClick={() => setErrorMessage("")}></button>
          </Alert>
        )}

        <Row className="justify-content-center">
          {/* Main SOS Trigger Column */}
          <Col lg={8} xl={7}>
            <Card className="border-0 shadow-lg mb-4">
              <CardBody className="p-4 text-center">
                <div className="mb-3">
                  <span className="badge bg-danger-subtle text-danger px-3 py-2 fs-13 rounded-pill">
                    <i className="ri-radar-fill me-1"></i> PRIORITY 1 EMERGENCY DISPATCH
                  </span>
                </div>

                <h3 className="fw-bold text-dark mt-2 mb-1">Need Immediate Medical Help?</h3>
                <p className="text-muted fs-14 mb-4">
                  Pressing SOS will broadcast your verified coordinates to the nearest available ambulance and trauma center.
                </p>

                {/* Big Animated SOS Button */}
                <div className="my-4">
                  <button
                    type="button"
                    onClick={handleTriggerSOS}
                    disabled={isSubmitting}
                    className="btn btn-danger rounded-circle shadow-lg pulse-button d-inline-flex flex-column align-items-center justify-content-center"
                    style={{
                      width: "180px",
                      height: "180px",
                      fontSize: "28px",
                      fontWeight: "bold",
                      letterSpacing: "2px",
                      boxShadow: "0 0 35px rgba(239, 71, 111, 0.6)",
                      border: "6px solid #fff",
                    }}
                  >
                    {isSubmitting ? (
                      <Spinner color="light" size="lg" />
                    ) : (
                      <>
                        <i className="ri-alarm-warning-fill fs-36 mb-1"></i>
                        <span>SOS</span>
                        <span className="fs-11 fw-normal text-white-50">DISPATCH NOW</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Location Selection Box */}
                <div className="p-3 bg-light rounded text-start mt-4 mb-3 border">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div>
                      <span className="fw-semibold text-dark fs-14">
                        <i className="ri-map-pin-2-fill text-danger me-1"></i> Incident Location:
                      </span>
                      <span className="badge bg-success-subtle text-success ms-2 fs-11">Consistent & Locked</span>
                    </div>

                    <div className="d-flex gap-2 align-items-center">
                      <Button
                        color="light"
                        size="sm"
                        className="py-1 px-2 fs-12 border"
                        onClick={() => setShowManualCoords(!showManualCoords)}
                      >
                        <i className="ri-compass-3-line me-1"></i> Lat/Lng
                      </Button>
                      <Button
                        color="outline-secondary"
                        size="sm"
                        className="py-1 px-2 fs-12"
                        onClick={detectDeviceGPS}
                        disabled={locating}
                        title="Detect via device GPS (Warning: PC browsers use Wi-Fi/IP which may be imprecise)"
                      >
                        {locating ? <Spinner size="sm" /> : <><i className="ri-crosshair-2-line me-1"></i> Use Device GPS</>}
                      </Button>
                    </div>
                  </div>

                  {/* Manual Coordinate Entry (Optional Collapsible) */}
                  <Collapse isOpen={showManualCoords}>
                    <div className="p-2 mb-2 bg-white rounded border">
                      <div className="row g-2 align-items-center">
                        <div className="col-5">
                          <input
                            type="number"
                            step="any"
                            placeholder="Latitude"
                            className="form-control form-control-sm"
                            value={manualLat}
                            onChange={(e) => setManualLat(e.target.value)}
                          />
                        </div>
                        <div className="col-5">
                          <input
                            type="number"
                            step="any"
                            placeholder="Longitude"
                            className="form-control form-control-sm"
                            value={manualLng}
                            onChange={(e) => setManualLng(e.target.value)}
                          />
                        </div>
                        <div className="col-2">
                          <button
                            type="button"
                            className="btn btn-sm btn-primary w-100"
                            onClick={applyManualCoords}
                          >
                            Set
                          </button>
                        </div>
                      </div>
                    </div>
                  </Collapse>

                  {/* Quick Preset Location Pills */}
                  <div className="mb-2">
                    <div className="text-muted fs-11 mb-1">⚡ Quick Locations (1-Click Pin):</div>
                    <div className="d-flex flex-wrap gap-1">
                      {LOCATION_PRESETS.map((lp) => {
                        const isCurr = Math.abs(location.latitude - lp.lat) < 0.001 && Math.abs(location.longitude - lp.lng) < 0.001;
                        return (
                          <button
                            key={lp.name}
                            type="button"
                            onClick={() => selectPresetLocation(lp)}
                            className={`btn btn-sm ${isCurr ? "btn-danger fw-semibold" : "btn-outline-secondary"}`}
                            style={{ fontSize: "11px", padding: "2px 8px" }}
                          >
                            <i className="ri-map-pin-line me-1"></i>{lp.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Google Places Autocomplete Search Box */}
                  <div className="position-relative mb-2">
                    <input
                      ref={autocompleteInputRef}
                      type="text"
                      defaultValue={address}
                      placeholder="🔍 Type address, landmark, colony, or hospital..."
                      className="form-control form-control-sm"
                      style={{ fontSize: '13px', paddingLeft: '12px' }}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  {/* Interactive Google Map Pin Dropper & Drag */}
                  {mapsLoaded && (
                    <div className="mb-2" style={{ borderRadius: '8px', overflow: 'hidden', border: '2px solid #dee2e6' }}>
                      <GoogleMapPicker
                        latitude={location.latitude}
                        longitude={location.longitude}
                        onLocationChange={(lat, lng, addr) => {
                          updateLocation(lat, lng, addr);
                        }}
                      />
                    </div>
                  )}

                  {/* Active Coordinate & Address Summary */}
                  <div className="p-2 bg-white rounded border d-flex justify-content-between align-items-center">
                    <div className="text-truncate me-2" style={{ maxWidth: '75%' }}>
                      <span className="fw-semibold text-dark fs-12">📍 Confirmed Address: </span>
                      <span className="text-muted fs-12">{address}</span>
                    </div>
                    <Badge color="danger" className="p-1 px-2 fs-11">
                      {location.latitude ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "Not Set"}
                    </Badge>
                  </div>
                </div>

                {/* Emergency Category Presets */}
                <div className="text-start mt-4">
                  <Label className="fw-semibold fs-13">Select Emergency Category:</Label>
                  <Row className="g-2">
                    {presets.map((p) => {
                      const isSelected = emergencyType === p.title;
                      return (
                        <Col sm={6} key={p.title}>
                          <div
                            onClick={() => setEmergencyType(p.title)}
                            className={`p-2 rounded border cursor-pointer d-flex align-items-center gap-2 ${
                              isSelected ? "border-danger bg-danger-subtle text-danger fw-semibold" : "bg-white text-muted"
                            }`}
                            style={{ cursor: "pointer" }}
                          >
                            <i className={`${p.icon} fs-18 text-${p.color}`}></i>
                            <span className="fs-13">{p.title}</span>
                          </div>
                        </Col>
                      );
                    })}
                  </Row>
                </div>

                {/* Optional Note & Contact */}
                <div className="text-start mt-3">
                  <Label htmlFor="notesInput" className="fw-semibold fs-13">Additional Details / Patient Condition (Optional):</Label>
                  <Input
                    id="notesInput"
                    type="textarea"
                    rows="2"
                    placeholder="e.g. Patient is conscious, complaining of acute chest pain radiating to left arm..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mb-3"
                  />
                </div>

                <div className="d-grid mt-3">
                  <Button
                    color="danger"
                    size="lg"
                    onClick={handleTriggerSOS}
                    disabled={isSubmitting}
                    className="fw-bold"
                  >
                    {isSubmitting ? <Spinner size="sm" className="me-2" /> : <i className="ri-send-plane-fill me-2"></i>}
                    DISPATCH AMBULANCE IMMEDIATELY
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>

          {/* Quick Dial Helplines */}
          <Col lg={4} xl={4}>
            <Card className="border-0 shadow-sm mb-4">
              <CardBody>
                <h5 className="card-title mb-3">Direct Emergency Helplines</h5>
                <div className="d-grid gap-2">
                  <a
                    href="tel:108"
                    className="btn btn-danger text-white d-flex align-items-center justify-content-between p-3 shadow-sm border-0"
                    style={{ background: "linear-gradient(135deg, #ef476f 0%, #e63946 100%)" }}
                  >
                    <div className="d-flex align-items-center">
                      <i className="ri-customer-service-2-fill fs-24 me-3 text-white"></i>
                      <div className="text-start">
                        <h6 className="mb-0 fw-bold text-white">National Ambulance Service</h6>
                        <span className="fs-12 text-white-75">Toll-Free Helpline: 108</span>
                      </div>
                    </div>
                    <Badge color="light" className="text-danger fw-bold px-2 py-1">24x7</Badge>
                  </a>
                  <a
                    href="tel:112"
                    className="btn btn-primary text-white d-flex align-items-center justify-content-between p-3 shadow-sm border-0 mt-2"
                  >
                    <div className="d-flex align-items-center">
                      <i className="ri-phone-fill fs-24 me-3 text-white"></i>
                      <div className="text-start">
                        <h6 className="mb-0 fw-bold text-white">Emergency Response System</h6>
                        <span className="fs-12 text-white-75">Unified Helpline: 112</span>
                      </div>
                    </div>
                    <Badge color="light" className="text-primary fw-bold px-2 py-1">Toll-Free</Badge>
                  </a>
                </div>

                <div className="mt-4 p-3 bg-light rounded text-center">
                  <i className="ri-chat-voice-line fs-28 text-primary mb-2 d-inline-block"></i>
                  <h6>Prefer AI Medical Chat?</h6>
                  <p className="text-muted fs-12 mb-3">
                    Our AI conversational triage agent can assess your symptoms and guide you through first aid.
                  </p>
                  <Button color="primary" size="sm" onClick={() => navigate("/medical-chat")}>
                    Open AI Medical Chat
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default EmergencySOS;
