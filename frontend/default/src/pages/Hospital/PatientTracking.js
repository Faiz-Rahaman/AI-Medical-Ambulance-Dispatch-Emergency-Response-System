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
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import AmbulanceRoute from "../MedicalChat/components/AmbulanceRoute";
import { getLoggedinUser } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const PatientTracking = () => {
  document.title = "Incoming Patient Tracking | Hospital Portal";

  const [dispatches, setDispatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedDispatch, setSelectedDispatch] = useState(null);

  const user = getLoggedinUser();
  const token = user?.token;

  const fetchTracking = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/hospital/tracking`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load tracking data");
      const data = await res.json();
      setDispatches(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedDispatch) {
        setSelectedDispatch(data[0]);
      }
    } catch (err) {
      console.error("Error loading tracking data:", err);
    } finally {
      setLoading(false);
    }
  }, [token, selectedDispatch]);

  useEffect(() => {
    setLoading(true);
    fetchTracking();
  }, [fetchTracking]);

  // Polling for live coordinates
  useEffect(() => {
    const timer = setInterval(() => {
      fetchTracking();
    }, 12000);
    return () => clearInterval(timer);
  }, [fetchTracking]);

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Patient Ambulance Tracking" pageTitle="Hospital Portal" />

        <Row>
          {/* Active Dispatches Sidebar */}
          <Col lg={4}>
            <Card>
              <CardHeader className="d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0">Active Dispatches ({dispatches.length})</h5>
                <Badge color="danger" pill>
                  LIVE RADAR
                </Badge>
              </CardHeader>
              <CardBody className="p-0">
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner color="primary" />
                  </div>
                ) : dispatches.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="ri-road-map-line fs-28 text-muted"></i>
                    <p className="text-muted mt-2">No active transit cases currently en route.</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {dispatches.map((disp) => {
                      const isSelected = selectedDispatch?.case_id === disp.case_id;
                      return (
                        <div
                          key={disp.case_id}
                          className={`list-group-item list-group-item-action cursor-pointer p-3 ${
                            isSelected ? "bg-light border-start border-4 border-primary" : ""
                          }`}
                          onClick={() => setSelectedDispatch(disp)}
                          style={{ cursor: "pointer" }}
                        >
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <span className="fw-bold text-primary">Case #{disp.case_id}</span>
                            <Badge color="warning" className="fs-11">
                              ETA {disp.eta_minutes} mins
                            </Badge>
                          </div>
                          <h6 className="fs-14 mb-1 text-truncate">{disp.patient_name}</h6>
                          <p className="text-muted fs-12 mb-2 text-truncate">
                            <i className="ri-map-pin-line text-danger me-1"></i>
                            {disp.patient_location?.address || "Live GPS Location"}
                          </p>
                          <div className="d-flex justify-content-between align-items-center fs-11 text-muted">
                            <span>
                              <i className="ri-truck-line me-1 text-primary"></i>
                              {disp.ambulance?.vehicle_number || "AMB-108"}
                            </span>
                            <span className="badge bg-danger-subtle text-danger">
                              {disp.triage_level || "Critical"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>

          {/* Map and Telemetry Display */}
          <Col lg={8}>
            {selectedDispatch ? (
              <div>
                {/* Live Telemetry Card */}
                <Card className="mb-3">
                  <CardBody>
                    <Row className="align-items-center">
                      <Col md={3} className="text-center border-end">
                        <span className="text-muted fs-12 text-uppercase">Est. Arrival Time</span>
                        <h3 className="text-primary mt-1 mb-0">{selectedDispatch.eta_minutes} Mins</h3>
                        <span className="badge bg-success-subtle text-success fs-11 mt-1">Direct Route</span>
                      </Col>
                      <Col md={3} className="text-center border-end">
                        <span className="text-muted fs-12 text-uppercase">Assigned Unit</span>
                        <h5 className="mt-1 mb-0 text-dark">{selectedDispatch.ambulance?.vehicle_number || "KA-01-EA-1088"}</h5>
                        <span className="text-muted fs-12">{selectedDispatch.ambulance?.type || "Advanced ICU"}</span>
                      </Col>
                      <Col md={3} className="text-center border-end">
                        <span className="text-muted fs-12 text-uppercase">Patient Vitals</span>
                        <h5 className="mt-1 mb-0 text-danger">{selectedDispatch.triage_level || "Emergency"}</h5>
                        <span className="text-muted fs-12">Contact: {selectedDispatch.patient_contact || "Logged"}</span>
                      </Col>
                      <Col md={3} className="text-center">
                        <span className="text-muted fs-12 text-uppercase">Transit Progress</span>
                        <Progress value={65} color="primary" className="mt-2" style={{ height: "8px" }} />
                        <span className="text-muted fs-11 mt-1 d-block">65% of route covered</span>
                      </Col>
                    </Row>
                  </CardBody>
                </Card>

                {/* Google Maps Route Component */}
                <Card>
                  <CardHeader className="d-flex align-items-center justify-content-between">
                    <h5 className="card-title mb-0">
                      Live Route Navigation: Case #{selectedDispatch.case_id}
                    </h5>
                    <Button color="soft-primary" size="sm" onClick={fetchTracking}>
                      <i className="ri-refresh-line me-1"></i> Refresh Map
                    </Button>
                  </CardHeader>
                  <CardBody>
                    {selectedDispatch.patient_location?.latitude && selectedDispatch.patient_location?.longitude ? (
                      <AmbulanceRoute
                        patientLat={selectedDispatch.patient_location.latitude}
                        patientLon={selectedDispatch.patient_location.longitude}
                        ambulanceType={selectedDispatch.ambulance?.type || "Advanced"}
                        onRouteLoaded={() => {}}
                      />
                    ) : (
                      <div className="text-center py-5">
                        <i className="ri-map-pin-warning-line fs-36 text-warning"></i>
                        <p className="mt-2 text-muted">Awaiting precise coordinates from patient unit...</p>
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            ) : (
              <Card>
                <CardBody className="text-center py-5">
                  <div className="avatar-lg mx-auto mb-3 bg-light rounded-circle d-flex align-items-center justify-content-center">
                    <i className="ri-map-2-line fs-28 text-muted"></i>
                  </div>
                  <h5>Select a Dispatch Case</h5>
                  <p className="text-muted">Choose an active incoming ambulance from the left sidebar to track its live progress.</p>
                </CardBody>
              </Card>
            )}
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default PatientTracking;
