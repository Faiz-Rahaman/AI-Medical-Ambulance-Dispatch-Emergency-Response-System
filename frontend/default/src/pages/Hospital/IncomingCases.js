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
  Table,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Alert,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { getLoggedinUser } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const IncomingCases = () => {
  document.title = "Incoming Cases | Hospital Portal";

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedCase, setSelectedCase] = useState(null);
  const [detailsModal, setDetailsModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");
  const [refreshInterval, setRefreshInterval] = useState(10); // seconds

  const user = getLoggedinUser();
  const token = user?.token;

  const fetchCases = useCallback(async () => {
    try {
      const url = filterStatus === "all" 
        ? `${API_URL}/hospital/cases` 
        : `${API_URL}/hospital/cases?status=${filterStatus}`;

      const res = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Failed to load cases");
      const data = await res.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading cases:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, token]);

  useEffect(() => {
    setLoading(true);
    fetchCases();
  }, [fetchCases]);

  // Polling interval for live incoming emergencies
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchCases();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [fetchCases, refreshInterval]);

  const updateCaseStatus = async (caseId, newStatus) => {
    try {
      const res = await fetch(`${API_URL}/hospital/cases/${caseId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        setActionSuccess(`Case #${caseId} updated to ${newStatus}`);
        fetchCases();
        if (selectedCase && selectedCase.id === caseId) {
          setSelectedCase({ ...selectedCase, status: newStatus });
        }
        setTimeout(() => setActionSuccess(""), 4000);
      }
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const triageBadge = (triage) => {
    const t = (triage || "").toLowerCase();
    if (t === "red" || t === "emergency") return <Badge className="badge-gradient-danger px-2 py-1">CRITICAL (RED)</Badge>;
    if (t === "orange" || t === "transport") return <Badge className="badge-gradient-warning px-2 py-1">URGENT (ORANGE)</Badge>;
    return <Badge className="badge-gradient-info px-2 py-1">STANDARD (YELLOW)</Badge>;
  };

  const statusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return <Badge color="warning" className="badge-border">Pending Dispatch</Badge>;
    if (s === "assigned") return <Badge color="primary" className="badge-border">En Route / Assigned</Badge>;
    if (s === "completed") return <Badge color="success" className="badge-border">Admitted / Completed</Badge>;
    return <Badge color="secondary">{status}</Badge>;
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Incoming Emergency Cases" pageTitle="Hospital Portal" />

        {actionSuccess && (
          <Alert color="success" className="alert-dismissible fade show" role="alert">
            <i className="ri-check-double-line me-2"></i>
            {actionSuccess}
          </Alert>
        )}

        {/* Filter and Stats Bar */}
        <Row className="mb-3">
          <Col md={8}>
            <div className="d-flex flex-wrap gap-2">
              <Button
                color={filterStatus === "all" ? "primary" : "light"}
                size="sm"
                onClick={() => setFilterStatus("all")}
              >
                All Cases ({cases.length})
              </Button>
              <Button
                color={filterStatus === "Pending" ? "warning" : "light"}
                size="sm"
                onClick={() => setFilterStatus("Pending")}
              >
                Pending ({cases.filter((c) => c.status === "Pending").length})
              </Button>
              <Button
                color={filterStatus === "Assigned" ? "info" : "light"}
                size="sm"
                onClick={() => setFilterStatus("Assigned")}
              >
                Assigned / Travelling ({cases.filter((c) => c.status === "Assigned").length})
              </Button>
              <Button
                color={filterStatus === "Completed" ? "success" : "light"}
                size="sm"
                onClick={() => setFilterStatus("Completed")}
              >
                Completed ({cases.filter((c) => c.status === "Completed").length})
              </Button>
            </div>
          </Col>
          <Col md={4} className="text-md-end mt-2 mt-md-0">
            <div className="d-inline-flex align-items-center gap-2">
              <span className="fs-12 text-muted">Live Feed:</span>
              <select
                className="form-select form-select-sm w-auto"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
              >
                <option value={5}>Every 5s</option>
                <option value={10}>Every 10s</option>
                <option value={30}>Every 30s</option>
                <option value={0}>Manual only</option>
              </select>
              <Button color="soft-primary" size="sm" onClick={fetchCases}>
                <i className="ri-refresh-line"></i>
              </Button>
            </div>
          </Col>
        </Row>

        {/* Cases Table */}
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader className="d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0">Active Dispatch Feed</h5>
                <Badge color="danger" pill className="fs-11">
                  ● LIVE RADAR
                </Badge>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-2 text-muted fs-13">Loading emergency cases...</p>
                  </div>
                ) : cases.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="avatar-lg mx-auto mb-3 bg-light rounded-circle d-flex align-items-center justify-content-center">
                      <i className="ri-hospital-line fs-24 text-primary"></i>
                    </div>
                    <h5>No Cases Found</h5>
                    <p className="text-muted">No emergency cases match the current filter.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-hover align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th scope="col">Case ID</th>
                          <th scope="col">Patient</th>
                          <th scope="col">Triage Level</th>
                          <th scope="col">Symptoms / Emergency</th>
                          <th scope="col">Location</th>
                          <th scope="col">Ambulance</th>
                          <th scope="col">Status</th>
                          <th scope="col" className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cases.map((c) => (
                          <tr key={c.id}>
                            <td className="fw-semibold">
                              <span className="text-primary">#{c.id}</span>
                            </td>
                            <td>
                              <div>
                                <h6 className="fs-14 mb-0">{c.patient_name || "Emergency Patient"}</h6>
                                <span className="text-muted fs-12">
                                  {c.age ? `${c.age} yrs` : "Age N/A"} • {c.gender === "M" ? "Male" : c.gender === "F" ? "Female" : "Other"}
                                </span>
                              </div>
                            </td>
                            <td>{triageBadge(c.patient_triage || c.triage_level)}</td>
                            <td>
                              <div style={{ maxWidth: "260px" }} className="text-truncate" title={c.symptoms}>
                                {c.symptoms || "Critical assistance required"}
                              </div>
                            </td>
                            <td>
                              <span className="text-muted fs-12">
                                <i className="ri-map-pin-line text-danger me-1"></i>
                                {c.location || "Coordinates logged"}
                              </span>
                            </td>
                            <td>
                              <Badge color="light" className="text-dark border">
                                {c.ambulance_type || "Advanced"}
                              </Badge>
                            </td>
                            <td>{statusBadge(c.status)}</td>
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-1">
                                <Button
                                  color="soft-info"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedCase(c);
                                    setDetailsModal(true);
                                  }}
                                >
                                  View
                                </Button>
                                {c.status === "Pending" && (
                                  <Button
                                    color="primary"
                                    size="sm"
                                    onClick={() => updateCaseStatus(c.id, "Assigned")}
                                  >
                                    Accept & Dispatch
                                  </Button>
                                )}
                                {c.status === "Assigned" && (
                                  <Button
                                    color="success"
                                    size="sm"
                                    onClick={() => updateCaseStatus(c.id, "Completed")}
                                  >
                                    Mark Admitted
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Case Details Modal */}
        <Modal isOpen={detailsModal} toggle={() => setDetailsModal(!detailsModal)} size="lg" centered>
          <ModalHeader toggle={() => setDetailsModal(!detailsModal)}>
            Case Details #{selectedCase?.id}
          </ModalHeader>
          <ModalBody>
            {selectedCase && (
              <div>
                <Row className="mb-3">
                  <Col md={6}>
                    <h6 className="text-muted fs-12 text-uppercase mb-1">Patient Information</h6>
                    <p className="fs-15 fw-semibold mb-1">{selectedCase.patient_name}</p>
                    <p className="text-muted mb-1">
                      Age: {selectedCase.age || "N/A"} | Gender: {selectedCase.gender || "N/A"}
                    </p>
                    <p className="text-muted mb-0">
                      Contact: <strong>{selectedCase.contact || "Not provided"}</strong>
                    </p>
                  </Col>
                  <Col md={6}>
                    <h6 className="text-muted fs-12 text-uppercase mb-1">Triage & Priority</h6>
                    <div className="mb-2">{triageBadge(selectedCase.patient_triage || selectedCase.triage_level)}</div>
                    <div className="mb-1">Status: {statusBadge(selectedCase.status)}</div>
                    <div className="text-muted fs-12">
                      Required Unit: <strong>{selectedCase.ambulance_type || "Advanced ICU"}</strong>
                    </div>
                  </Col>
                </Row>

                <hr />

                <div className="mb-3">
                  <h6 className="text-muted fs-12 text-uppercase mb-1">Reported Symptoms & Condition</h6>
                  <div className="p-3 bg-light rounded text-dark fs-14">
                    {selectedCase.symptoms || "No symptom description available."}
                  </div>
                </div>

                <div className="mb-3">
                  <h6 className="text-muted fs-12 text-uppercase mb-1">Incident Location</h6>
                  <p className="mb-1">
                    <i className="ri-map-pin-2-fill text-danger me-1"></i>
                    {selectedCase.location || "Location not resolved"}
                  </p>
                  {selectedCase.latitude && selectedCase.longitude && (
                    <p className="text-muted fs-12 mb-0">
                      GPS Coordinates: {selectedCase.latitude}, {selectedCase.longitude}
                    </p>
                  )}
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            {selectedCase?.status === "Pending" && (
              <Button
                color="primary"
                onClick={() => {
                  updateCaseStatus(selectedCase.id, "Assigned");
                  setDetailsModal(false);
                }}
              >
                Accept & Dispatch Ambulance
              </Button>
            )}
            {selectedCase?.status === "Assigned" && (
              <Button
                color="success"
                onClick={() => {
                  updateCaseStatus(selectedCase.id, "Completed");
                  setDetailsModal(false);
                }}
              >
                Confirm Patient Admitted
              </Button>
            )}
            <Button color="secondary" onClick={() => setDetailsModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default IncomingCases;
