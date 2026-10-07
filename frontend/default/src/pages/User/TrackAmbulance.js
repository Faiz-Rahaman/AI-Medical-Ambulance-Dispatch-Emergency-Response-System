import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Button,
  Spinner,
  Progress,
  Alert,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { useLocation, useNavigate } from "react-router-dom";
import AmbulanceRoute from "../MedicalChat/components/AmbulanceRoute";
import { getLoggedinUser } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const TrackAmbulance = () => {
  document.title = "Live Ambulance Tracking | Citizen Portal";
  const navigate = useNavigate();
  const location = useLocation();

  // Extract caseId from query params ?caseId=...
  const queryParams = new URLSearchParams(location.search);
  const caseIdParam = queryParams.get("caseId");

  const [trackData, setTrackData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(6); // minutes
  const [errorMsg, setErrorMsg] = useState("");

  const user = getLoggedinUser();
  const token = user?.token;

  const fetchTracking = useCallback(async () => {
    try {
      // If no caseId given, fetch user's most recent case
      let idToFetch = caseIdParam;
      if (!idToFetch) {
        const userCasesRes = await fetch(`${API_URL}/user/my-cases`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const cases = await userCasesRes.json();
        if (Array.isArray(cases) && cases.length > 0) {
          idToFetch = cases[0].id;
        } else {
          idToFetch = 1;
        }
      }

      const res = await fetch(`${API_URL}/user/track/${idToFetch}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Tracking data unavailable");
      const data = await res.json();
      setTrackData(data);
      if (data.eta_minutes) {
        setCountdown(data.eta_minutes);
      }
    } catch (err) {
      console.error("Error fetching tracking:", err);
      setErrorMsg("Unable to retrieve live telemetry for this case.");
    } finally {
      setLoading(false);
    }
  }, [caseIdParam, token]);

  useEffect(() => {
    fetchTracking();
  }, [fetchTracking]);

  // Periodic ETA countdown simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 1));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Track Dispatched Ambulance" pageTitle="Citizen Portal" />

        {errorMsg && (
          <Alert color="warning" className="mb-4">
            <i className="ri-alert-line me-2"></i>
            {errorMsg}
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" size="lg" />
            <p className="mt-3 text-muted">Connecting to ambulance GPS satellite link...</p>
          </div>
        ) : trackData ? (
          <>
            {/* Live Telemetry Banner */}
            <Row>
              <Col lg={12}>
                <Card className="border-0 shadow-sm bg-primary text-white mb-4">
                  <CardBody className="p-4">
                    <Row className="align-items-center">
                      <Col md={7}>
                        <div className="d-flex align-items-center mb-2">
                          <span className="badge bg-danger fs-12 px-3 py-1 me-2 animate-pulse">
                            ● AMBULANCE EN ROUTE
                          </span>
                          <span className="text-white-50 fs-13">Case #{trackData.case_id}</span>
                        </div>
                        <h2 className="text-white fw-bold mb-1">
                          Arriving in approx. <span className="text-warning">{countdown} Minutes</span>
                        </h2>
                        <p className="text-white-70 fs-14 mb-0">
                          Unit <strong>{trackData.ambulance?.vehicle_number}</strong> is responding with sirens active. Stay calm and keep your phone line clear.
                        </p>
                      </Col>
                      <Col md={5} className="mt-3 mt-md-0 text-md-end">
                        <div className="d-inline-flex flex-wrap gap-2">
                          <a
                            href={`tel:${trackData.ambulance?.driver_contact || "+16089013032"}`}
                            className="btn btn-light text-primary fw-semibold"
                          >
                            <i className="ri-phone-fill me-1 text-success"></i> Call AI Dispatch ({trackData.ambulance?.driver_contact || "+1 (608) 901-3032"})
                          </a>
                          <Button color="outline-light" onClick={fetchTracking}>
                            <i className="ri-refresh-line"></i> Refresh GPS
                          </Button>
                        </div>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>
              </Col>
            </Row>

            {/* Quick Cards Row */}
            <Row>
              <Col md={4}>
                <Card className="card-animate">
                  <CardBody>
                    <div className="d-flex align-items-center">
                      <div className="avatar-sm flex-shrink-0 me-3">
                        <span className="avatar-title bg-danger-subtle rounded-circle fs-2 text-danger">
                          <i className="ri-truck-fill"></i>
                        </span>
                      </div>
                      <div>
                        <p className="text-muted text-uppercase fs-12 mb-0">Assigned Vehicle</p>
                        <h5 className="fs-16 fw-bold mb-0 text-dark">{trackData.ambulance?.vehicle_number}</h5>
                        <span className="badge bg-light text-muted border mt-1">
                          {trackData.ambulance?.type || "Advanced ICU"}
                        </span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="card-animate">
                  <CardBody>
                    <div className="d-flex align-items-center">
                      <div className="avatar-sm flex-shrink-0 me-3">
                        <span className="avatar-title bg-primary-subtle rounded-circle fs-2 text-primary">
                          <i className="ri-hospital-line"></i>
                        </span>
                      </div>
                      <div>
                        <p className="text-muted text-uppercase fs-12 mb-0">Receiving Trauma Center</p>
                        <h5 className="fs-15 fw-bold mb-0 text-truncate text-dark" style={{ maxWidth: "200px" }}>
                          {trackData.hospital?.name}
                        </h5>
                        <span className="text-muted fs-12 d-block">{trackData.hospital?.address}</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>

              <Col md={4}>
                <Card className="card-animate">
                  <CardBody>
                    <div className="d-flex align-items-center">
                      <div className="avatar-sm flex-shrink-0 me-3">
                        <span className="avatar-title bg-success-subtle rounded-circle fs-2 text-success">
                          <i className="ri-map-pin-user-line"></i>
                        </span>
                      </div>
                      <div>
                        <p className="text-muted text-uppercase fs-12 mb-0">Your GPS Location</p>
                        <h5 className="fs-14 fw-bold mb-0 text-truncate text-dark" style={{ maxWidth: "200px" }}>
                          {trackData.patient?.location || "Current GPS Location"}
                        </h5>
                        <span className="text-success fs-12 fw-semibold">GPS Locked & Transmitted</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>

            {/* Map and First Aid Instructions */}
            <Row>
              <Col lg={8}>
                <Card>
                  <CardHeader className="d-flex justify-content-between align-items-center">
                    <h5 className="card-title mb-0">Live Satellite Route Map</h5>
                    <span className="badge bg-success-subtle text-success">Live GPS Stream Active</span>
                  </CardHeader>
                  <CardBody>
                    {trackData.patient?.latitude && trackData.patient?.longitude ? (
                      <AmbulanceRoute
                        patientLat={trackData.patient.latitude}
                        patientLon={trackData.patient.longitude}
                        ambulanceType={trackData.ambulance?.type || "Advanced"}
                        onRouteLoaded={() => {}}
                      />
                    ) : (
                      <div className="text-center py-5">
                        <i className="ri-map-pin-line fs-32 text-muted"></i>
                        <p className="mt-2 text-muted">Acquiring coordinates for live map...</p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>

              <Col lg={4}>
                <Card>
                  <CardHeader>
                    <h5 className="card-title mb-0">
                      <i className="ri-first-aid-kit-line text-danger me-1"></i> Immediate First Aid Tips
                    </h5>
                  </CardHeader>
                  <CardBody>
                    <div className="d-flex mb-3">
                      <div className="avatar-xs flex-shrink-0 me-3">
                        <span className="avatar-title bg-light text-primary rounded-circle fw-bold">1</span>
                      </div>
                      <div>
                        <h6 className="fs-13 mb-1">Clear the Way</h6>
                        <p className="text-muted fs-12 mb-0">
                          Ensure front doors, hallways, and gates are unlocked and accessible for paramedics with stretchers.
                        </p>
                      </div>
                    </div>

                    <div className="d-flex mb-3">
                      <div className="avatar-xs flex-shrink-0 me-3">
                        <span className="avatar-title bg-light text-primary rounded-circle fw-bold">2</span>
                      </div>
                      <div>
                        <h6 className="fs-13 mb-1">Keep Patient Calm</h6>
                        <p className="text-muted fs-12 mb-0">
                          Do not move the patient unnecessarily. Loosen tight clothing around the neck and chest.
                        </p>
                      </div>
                    </div>

                    <div className="d-flex mb-3">
                      <div className="avatar-xs flex-shrink-0 me-3">
                        <span className="avatar-title bg-light text-primary rounded-circle fw-bold">3</span>
                      </div>
                      <div>
                        <h6 className="fs-13 mb-1">Gather Medical Records</h6>
                        <p className="text-muted fs-12 mb-0">
                          Have any current medications, prescriptions, or allergies ready to hand over to the paramedic crew.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 p-3 bg-light rounded text-center">
                      <p className="text-muted fs-12 mb-2">Need immediate symptom advice?</p>
                      <Button color="soft-primary" size="sm" onClick={() => navigate("/medical-chat")}>
                        <i className="ri-message-3-line me-1"></i> Consult AI Medical Assistant
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>
          </>
        ) : (
          <Card>
            <CardBody className="text-center py-5">
              <h5>No Active Dispatch Found</h5>
              <p className="text-muted">You do not currently have an active emergency dispatch to track.</p>
              <Button color="danger" onClick={() => navigate("/user/emergency")}>
                Go to Emergency SOS
              </Button>
            </CardBody>
          </Card>
        )}
      </Container>
    </div>
  );
};

export default TrackAmbulance;
