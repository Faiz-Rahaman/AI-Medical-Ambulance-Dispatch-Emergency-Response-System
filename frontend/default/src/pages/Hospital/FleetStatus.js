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
  Progress,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Input,
  Label,
  Alert,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { getLoggedinUser } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const FleetStatus = () => {
  document.title = "Hospital Fleet Status | Hospital Portal";

  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAmb, setSelectedAmb] = useState(null);
  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("available");
  const [newLocation, setNewLocation] = useState("");
  const [newFuel, setNewFuel] = useState(100);
  const [message, setMessage] = useState("");

  const user = getLoggedinUser();
  const token = user?.token;

  const fetchAmbulances = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/hospital/ambulances`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load ambulances");
      const data = await res.json();
      setAmbulances(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading ambulances:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchAmbulances();
  }, [fetchAmbulances]);

  const handleUpdateStatus = async () => {
    if (!selectedAmb) return;
    try {
      const res = await fetch(`${API_URL}/hospital/ambulances/${selectedAmb.ambulance_id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          current_location: newLocation || selectedAmb.current_location,
          fuel_level: Number(newFuel),
        }),
      });

      if (res.ok) {
        setMessage(`Ambulance ${selectedAmb.vehicle_number} updated successfully!`);
        setStatusModal(false);
        fetchAmbulances();
        setTimeout(() => setMessage(""), 4000);
      }
    } catch (err) {
      console.error("Error updating ambulance:", err);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || "").toLowerCase();
    if (s === "available") return <Badge color="success" className="badge-border">AVAILABLE</Badge>;
    if (s === "dispatch") return <Badge color="danger" className="badge-border">ON DISPATCH</Badge>;
    if (s === "maintenance") return <Badge color="warning" className="badge-border">MAINTENANCE</Badge>;
    return <Badge color="secondary" className="badge-border">OUT OF SERVICE</Badge>;
  };

  const getTypeBadge = (type) => {
    if (type === "ICU") return <span className="badge bg-danger-subtle text-danger">ICU Mobile Unit</span>;
    if (type === "Advanced") return <span className="badge bg-warning-subtle text-warning">Advanced Life Support</span>;
    return <span className="badge bg-info-subtle text-info">Basic Life Support</span>;
  };

  const total = ambulances.length;
  const available = ambulances.filter((a) => a.status === "available").length;
  const dispatched = ambulances.filter((a) => a.status === "dispatch").length;
  const maintenance = ambulances.filter((a) => a.status === "maintenance" || a.status === "out_of_services").length;

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Hospital Ambulance Fleet" pageTitle="Hospital Portal" />

        {message && (
          <Alert color="success" className="alert-dismissible fade show" role="alert">
            <i className="ri-checkbox-circle-line me-2"></i>
            {message}
          </Alert>
        )}

        {/* Stats Row */}
        <Row>
          <Col md={3} sm={6}>
            <Card className="card-animate">
              <CardBody className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-uppercase fw-medium text-muted text-truncate fs-13 mb-0">Total Fleet</p>
                  <h4 className="fs-22 fw-semibold ff-secondary mb-0 mt-2">{total}</h4>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-primary-subtle rounded fs-3">
                    <i className="ri-car-line text-primary"></i>
                  </span>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="card-animate">
              <CardBody className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-uppercase fw-medium text-muted text-truncate fs-13 mb-0">Available Ready</p>
                  <h4 className="fs-22 fw-semibold ff-secondary mb-0 mt-2 text-success">{available}</h4>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-success-subtle rounded fs-3">
                    <i className="ri-check-line text-success"></i>
                  </span>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="card-animate">
              <CardBody className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-uppercase fw-medium text-muted text-truncate fs-13 mb-0">On Active Dispatch</p>
                  <h4 className="fs-22 fw-semibold ff-secondary mb-0 mt-2 text-danger">{dispatched}</h4>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-danger-subtle rounded fs-3">
                    <i className="ri-alarm-warning-line text-danger"></i>
                  </span>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3} sm={6}>
            <Card className="card-animate">
              <CardBody className="d-flex align-items-center justify-content-between">
                <div>
                  <p className="text-uppercase fw-medium text-muted text-truncate fs-13 mb-0">In Maintenance</p>
                  <h4 className="fs-22 fw-semibold ff-secondary mb-0 mt-2 text-warning">{maintenance}</h4>
                </div>
                <div className="avatar-sm flex-shrink-0">
                  <span className="avatar-title bg-warning-subtle rounded fs-3">
                    <i className="ri-tools-line text-warning"></i>
                  </span>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Fleet Table */}
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader className="d-flex align-items-center justify-content-between">
                <h5 className="card-title mb-0">Live Fleet Roster</h5>
                <Button color="soft-primary" size="sm" onClick={fetchAmbulances}>
                  <i className="ri-refresh-line me-1"></i> Refresh
                </Button>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-2 text-muted fs-13">Loading hospital fleet...</p>
                  </div>
                ) : ambulances.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="avatar-lg mx-auto mb-3 bg-light rounded-circle d-flex align-items-center justify-content-center">
                      <i className="ri-caravan-line fs-24 text-muted"></i>
                    </div>
                    <h5>No Ambulances Registered</h5>
                    <p className="text-muted">Ambulance fleet records will appear here.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-hover align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Vehicle Number</th>
                          <th>Ambulance Type</th>
                          <th>Current Status</th>
                          <th>Fuel Level</th>
                          <th>Staff Crew</th>
                          <th>Station / Base</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ambulances.map((amb) => (
                          <tr key={amb.ambulance_id}>
                            <td className="fw-semibold text-primary">#{amb.ambulance_id}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar-xs me-2">
                                  <span className="avatar-title bg-light text-primary rounded-circle">
                                    <i className="ri-truck-line"></i>
                                  </span>
                                </div>
                                <span className="fw-bold">{amb.vehicle_number}</span>
                              </div>
                            </td>
                            <td>{getTypeBadge(amb.type_of_ambulance)}</td>
                            <td>{getStatusBadge(amb.status)}</td>
                            <td style={{ minWidth: "120px" }}>
                              <div className="d-flex align-items-center gap-2">
                                <Progress
                                  value={amb.fuel_level || 50}
                                  color={amb.fuel_level < 25 ? "danger" : amb.fuel_level < 60 ? "warning" : "success"}
                                  className="w-100"
                                  style={{ height: "6px" }}
                                />
                                <span className="fs-12 text-muted">{amb.fuel_level || 0}%</span>
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                <i className="ri-user-star-line me-1 text-primary"></i>
                                {amb.no_of_staffs || 2} Staff
                              </span>
                            </td>
                            <td>
                              <span className="text-muted fs-12">
                                <i className="ri-map-pin-line text-muted me-1"></i>
                                {amb.current_location || "Central Station"}
                              </span>
                            </td>
                            <td className="text-end">
                              <Button
                                color="soft-primary"
                                size="sm"
                                onClick={() => {
                                  setSelectedAmb(amb);
                                  setNewStatus(amb.status);
                                  setNewLocation(amb.current_location || "");
                                  setNewFuel(amb.fuel_level || 80);
                                  setStatusModal(true);
                                }}
                              >
                                Update Status
                              </Button>
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

        {/* Update Ambulance Modal */}
        <Modal isOpen={statusModal} toggle={() => setStatusModal(!statusModal)} centered>
          <ModalHeader toggle={() => setStatusModal(!statusModal)}>
            Update Ambulance: {selectedAmb?.vehicle_number}
          </ModalHeader>
          <ModalBody>
            <div className="mb-3">
              <Label htmlFor="statusSelect" className="form-label">Dispatch Status</Label>
              <Input
                id="statusSelect"
                type="select"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
              >
                <option value="available">Available (Ready for Dispatch)</option>
                <option value="dispatch">On Active Dispatch (En Route)</option>
                <option value="maintenance">Maintenance / Servicing</option>
                <option value="out_of_services">Out of Service</option>
              </Input>
            </div>

            <div className="mb-3">
              <Label htmlFor="locationInput" className="form-label">Current Station Location</Label>
              <Input
                id="locationInput"
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="e.g. Apollo Bay 3, Central Hub"
              />
            </div>

            <div className="mb-3">
              <Label htmlFor="fuelInput" className="form-label">Fuel Level (%)</Label>
              <Input
                id="fuelInput"
                type="number"
                min="0"
                max="100"
                value={newFuel}
                onChange={(e) => setNewFuel(e.target.value)}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setStatusModal(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleUpdateStatus}>
              Save Updates
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default FleetStatus;
