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
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { Link, useNavigate } from "react-router-dom";
import { getLoggedinUser } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const MyCases = () => {
  document.title = "My Emergency Requests | AI Ambulance Dispatch";
  const navigate = useNavigate();

  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);

  const user = getLoggedinUser();
  const token = user?.token;

  const fetchMyCases = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/user/my-cases`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load user cases");
      const data = await res.json();
      setCases(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading user cases:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchMyCases();
  }, [fetchMyCases]);

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "pending") return <Badge color="warning" className="badge-border">DISPATCH PENDING</Badge>;
    if (s === "assigned") return <Badge color="primary" className="badge-border">AMBULANCE EN ROUTE</Badge>;
    if (s === "completed") return <Badge color="success" className="badge-border">RESOLVED / ADMITTED</Badge>;
    return <Badge color="secondary">{status}</Badge>;
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="My Emergency Cases" pageTitle="Citizen Portal" />

        <Row className="mb-3">
          <Col className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">Emergency Incident History</h5>
              <p className="text-muted fs-13 mb-0">Track dispatches and status updates for your medical requests.</p>
            </div>
            <Button color="danger" onClick={() => navigate("/user/emergency")}>
              <i className="ri-alarm-warning-line me-1"></i> Trigger New SOS
            </Button>
          </Col>
        </Row>

        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Recent Requests ({cases.length})</h5>
                <Button color="soft-primary" size="sm" onClick={fetchMyCases}>
                  <i className="ri-refresh-line me-1"></i> Refresh
                </Button>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-2 text-muted">Retrieving your emergency cases...</p>
                  </div>
                ) : cases.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="avatar-lg mx-auto mb-3 bg-light rounded-circle d-flex align-items-center justify-content-center">
                      <i className="ri-shield-check-line fs-32 text-success"></i>
                    </div>
                    <h5>No Active Emergencies</h5>
                    <p className="text-muted">You have no pending or past ambulance requests on record.</p>
                    <Button color="danger" size="sm" onClick={() => navigate("/user/emergency")}>
                      Emergency SOS Portal
                    </Button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-hover align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Case ID</th>
                          <th>Triage Priority</th>
                          <th>Symptoms / Description</th>
                          <th>Location</th>
                          <th>Status</th>
                          <th>Date / Time</th>
                          <th className="text-end">Live Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cases.map((c) => (
                          <tr key={c.id}>
                            <td className="fw-bold text-primary">#{c.id}</td>
                            <td>
                              <span className={`badge ${
                                c.triage_level === 'Emergency' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning'
                              }`}>
                                {c.triage_level || "Urgent"}
                              </span>
                            </td>
                            <td>
                              <div style={{ maxWidth: "320px" }} className="text-truncate">
                                {c.symptoms || "Emergency dispatch"}
                              </div>
                            </td>
                            <td>
                              <span className="text-muted fs-12">
                                <i className="ri-map-pin-line text-danger me-1"></i>
                                {c.location || "GPS Coordinates"}
                              </span>
                            </td>
                            <td>{getStatusBadge(c.status)}</td>
                            <td>
                              <span className="text-muted fs-12">
                                {c.created_at ? new Date(c.created_at).toLocaleString() : "Just now"}
                              </span>
                            </td>
                            <td className="text-end">
                              {c.status !== "Completed" ? (
                                <Button
                                  color="primary"
                                  size="sm"
                                  onClick={() => navigate(`/user/track?caseId=${c.id}`)}
                                >
                                  <i className="ri-navigation-line me-1"></i> Track Ambulance
                                </Button>
                              ) : (
                                <Badge color="success-subtle" className="text-success p-2">
                                  Case Resolved
                                </Badge>
                              )}
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
      </Container>
    </div>
  );
};

export default MyCases;
