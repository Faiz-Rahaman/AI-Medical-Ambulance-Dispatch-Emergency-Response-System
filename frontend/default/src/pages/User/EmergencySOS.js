import React, { useState, useEffect } from "react";
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
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { useNavigate } from "react-router-dom";
import { getLoggedinUser } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const EmergencySOS = () => {
  document.title = "Emergency SOS | AI Ambulance Dispatch";
  const navigate = useNavigate();

  const user = getLoggedinUser();
  const token = user?.token;

  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [locating, setLocating] = useState(false);
  const [address, setAddress] = useState("");
  const [emergencyType, setEmergencyType] = useState("Cardiac / Heart Emergency");
  const [notes, setNotes] = useState("");
  const [contact, setContact] = useState(user?.email || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Location presets for instant selection
  const locationPresets = [
    { name: "Pallavaram, Chennai", lat: 12.9675, lng: 80.1491, landmark: "GST Road / Pallavaram Station, Chennai" },
    { name: "Vengal College / Tiruvallur", lat: 13.2340, lng: 80.0120, landmark: "Vengal College / Primary Health Centre, Tiruvallur" },
    { name: "Tambaram / Chromepet", lat: 12.9516, lng: 80.1462, landmark: "Rela Hospital / Chromepet, Chennai" },
    { name: "Chennai Central", lat: 13.0827, lng: 80.2707, landmark: "Chennai Central / Park Town" },
  ];

  // Auto-fetch GPS coordinates on page load (with Pallavaram fallback)
  useEffect(() => {
    fetchCurrentLocation();
  }, []);

  const selectPresetLocation = (preset) => {
    setLocation({ latitude: preset.lat, longitude: preset.lng });
    setAddress(preset.landmark);
  };

  const fetchCurrentLocation = () => {
    setLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setAddress(`GPS: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setLocating(false);
        },
        (err) => {
          console.warn("GPS error:", err);
          // Fallback to Pallavaram, Chennai
          setLocation({ latitude: 12.9675, longitude: 80.1491 });
          setAddress("GST Road, Pallavaram, Chennai (Local Center)");
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      setLocation({ latitude: 12.9675, longitude: 80.1491 });
      setAddress("GST Road, Pallavaram, Chennai");
      setLocating(false);
    }
  };

  const handleTriggerSOS = async () => {
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const payload = {
        latitude: location.latitude || 12.9675,
        longitude: location.longitude || 80.1491,
        location: address || "Pallavaram, Chennai",
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
          <Alert color="danger" className="mb-4">
            <i className="ri-alarm-warning-fill me-2 fs-16"></i>
            {errorMessage}
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
                  Pressing SOS will broadcast your GPS location to the nearest available local ambulance and trauma center.
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

                {/* Location Detection Box with Quick Presets */}
                <div className="p-3 bg-light rounded text-start mt-4 mb-3 border">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <span className="fw-semibold text-dark fs-13">
                      <i className="ri-map-pin-2-fill text-danger me-1"></i> Incident Location:
                    </span>
                    <Button
                      color="link"
                      size="sm"
                      className="p-0 text-decoration-none"
                      onClick={fetchCurrentLocation}
                      disabled={locating}
                    >
                      {locating ? <Spinner size="sm" /> : <><i className="ri-crosshair-2-line me-1"></i> Detect GPS</>}
                    </Button>
                  </div>

                  {/* Quick Preset Location Pills */}
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {locationPresets.map((lp) => {
                      const isCurr = location.latitude === lp.lat && location.longitude === lp.lng;
                      return (
                        <button
                          key={lp.name}
                          type="button"
                          onClick={() => selectPresetLocation(lp)}
                          className={`btn btn-sm ${isCurr ? "btn-danger" : "btn-outline-secondary"}`}
                          style={{ fontSize: "11px", padding: "2px 8px" }}
                        >
                          <i className="ri-map-pin-line me-1"></i>{lp.name}
                        </button>
                      );
                    })}
                  </div>

                  <Input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter landmark or street address"
                    className="form-control-sm mb-2"
                  />
                  <div className="fs-12 text-muted d-flex justify-content-between align-items-center">
                    <span>Coordinates: {location.latitude ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : "Detecting GPS..."}</span>
                    <span className="badge bg-success-subtle text-success">Nearest Local Fleet Enabled</span>
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

          {/* Quick Dial Helplines & VAPI AI Voice Line */}
          <Col lg={4} xl={4}>
            <Card className="border-0 shadow-sm mb-4">
              <CardBody>
                <h5 className="card-title mb-3">Direct Emergency Voice Lines</h5>
                <div className="d-grid gap-2">
                  {/* Dedicated VAPI Voice Assistant Hotline */}
                  <a
                    href="tel:+16089013032"
                    className="btn btn-danger text-white d-flex align-items-center justify-content-between p-3 shadow-sm border-0"
                    style={{ background: "linear-gradient(135deg, #ef476f 0%, #e63946 100%)" }}
                  >
                    <div className="d-flex align-items-center">
                      <i className="ri-customer-service-2-fill fs-24 me-3 text-white"></i>
                      <div className="text-start">
                        <h6 className="mb-0 fw-bold text-white">VAPI AI Ambulance Line</h6>
                        <span className="fs-12 text-white-75">+1 (608) 901-3032 (Voice Triage)</span>
                      </div>
                    </div>
                    <Badge color="light" className="text-danger fw-bold px-2 py-1">AI Voice</Badge>
                  </a>

                  <a href="tel:108" className="btn btn-outline-danger d-flex align-items-center justify-content-between p-3">
                    <div className="d-flex align-items-center">
                      <i className="ri-phone-fill fs-24 me-3 text-danger"></i>
                      <div className="text-start">
                        <h6 className="mb-0 fw-bold">Call 108</h6>
                        <span className="fs-12 text-muted">National Ambulance Helpline</span>
                      </div>
                    </div>
                    <Badge color="danger">Toll Free</Badge>
                  </a>

                  <a href="tel:112" className="btn btn-outline-primary d-flex align-items-center justify-content-between p-3">
                    <div className="d-flex align-items-center">
                      <i className="ri-alarm-line fs-24 me-3 text-primary"></i>
                      <div className="text-start">
                        <h6 className="mb-0 fw-bold">Call 112</h6>
                        <span className="fs-12 text-muted">All-in-One Emergency Services</span>
                      </div>
                    </div>
                    <Badge color="primary">24x7</Badge>
                  </a>

                  <a href="tel:102" className="btn btn-outline-info d-flex align-items-center justify-content-between p-3">
                    <div className="d-flex align-items-center">
                      <i className="ri-women-line fs-24 me-3 text-info"></i>
                      <div className="text-start">
                        <h6 className="mb-0 fw-bold">Call 102</h6>
                        <span className="fs-12 text-muted">Maternity & Child Emergency</span>
                      </div>
                    </div>
                    <Badge color="info">Free</Badge>
                  </a>
                </div>

                <div className="mt-4 p-3 bg-light rounded text-center">
                  <i className="ri-chat-voice-line fs-28 text-primary mb-2 d-inline-block"></i>
                  <h6>Prefer AI Voice or Chat?</h6>
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
