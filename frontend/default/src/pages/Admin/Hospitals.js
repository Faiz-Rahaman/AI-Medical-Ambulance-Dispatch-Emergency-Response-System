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
  Input,
  Label,
  Alert,
} from "reactstrap";
import BreadCrumb from "../../Components/Common/BreadCrumb";
import { getLoggedinUser } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const Hospitals = () => {
  document.title = "Hospital Management | Admin Panel";

  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: "", type: "success" });

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    contact: "",
    available_beds: 15,
    latitude: "",
    longitude: "",
  });

  const currentUser = getLoggedinUser();
  const token = currentUser?.token;

  const fetchHospitals = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/hospitals`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load hospitals");
      const data = await res.json();
      setHospitals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading hospitals:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchHospitals();
  }, [fetchHospitals]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedHospital(null);
    setFormData({
      name: "",
      address: "",
      contact: "",
      available_beds: 20,
      latitude: "",
      longitude: "",
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (h) => {
    setIsEditing(true);
    setSelectedHospital(h);
    setFormData({
      name: h.name,
      address: h.address || "",
      contact: h.contact || "",
      available_beds: h.available_beds || 10,
      latitude: h.latitude || "",
      longitude: h.longitude || "",
    });
    setModalOpen(true);
  };

  const handleSaveHospital = async () => {
    try {
      if (!formData.name) {
        setFeedbackMsg({ text: "Hospital Name is required", type: "danger" });
        return;
      }

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `${API_URL}/admin/hospitals/${selectedHospital.id}`
        : `${API_URL}/admin/hospitals`;

      const payload = {
        name: formData.name.trim(),
        address: formData.address,
        contact: formData.contact,
        available_beds: parseInt(formData.available_beds) || 10,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || "Failed to save hospital");
      }

      setFeedbackMsg({
        text: isEditing ? "Hospital updated successfully!" : "Hospital added successfully!",
        type: "success",
      });
      setModalOpen(false);
      fetchHospitals();
      setTimeout(() => setFeedbackMsg({ text: "", type: "success" }), 4000);
    } catch (err) {
      setFeedbackMsg({ text: err.message, type: "danger" });
    }
  };

  const handleDeleteHospital = async (hospitalId) => {
    if (!window.confirm("Are you sure you want to delete this hospital record?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/hospitals/${hospitalId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setFeedbackMsg({ text: "Hospital deleted successfully", type: "success" });
        fetchHospitals();
        setTimeout(() => setFeedbackMsg({ text: "", type: "success" }), 4000);
      }
    } catch (err) {
      setFeedbackMsg({ text: "Error deleting hospital", type: "danger" });
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="Hospital Network" pageTitle="Admin Panel" />

        {feedbackMsg.text && (
          <Alert color={feedbackMsg.type} className="alert-dismissible fade show">
            {feedbackMsg.text}
          </Alert>
        )}

        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title mb-0">Affiliated Hospitals & Trauma Centers ({hospitals.length})</h5>
                  <span className="text-muted fs-12">Network dispatch destinations and bed availability</span>
                </div>
                <Button color="success" onClick={handleOpenCreateModal}>
                  <i className="ri-hospital-line me-1"></i> Add Hospital
                </Button>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-2 text-muted">Loading hospital facilities...</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-hover align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Hospital Name</th>
                          <th>Address</th>
                          <th>Emergency Contact</th>
                          <th>Available Beds</th>
                          <th>Coordinates (Lat, Lng)</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hospitals.map((h) => (
                          <tr key={h.id}>
                            <td className="fw-semibold text-primary">#{h.id}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar-xs me-2">
                                  <span className="avatar-title bg-danger-subtle text-danger rounded-circle">
                                    <i className="ri-hospital-fill"></i>
                                  </span>
                                </div>
                                <span className="fw-bold text-dark">{h.name}</span>
                              </div>
                            </td>
                            <td>
                              <span className="text-muted fs-12 text-truncate d-inline-block" style={{ maxWidth: "240px" }}>
                                {h.address || "Address not provided"}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                <i className="ri-phone-line text-success me-1"></i>
                                {h.contact || "N/A"}
                              </span>
                            </td>
                            <td>
                              <Badge color={h.available_beds > 5 ? "success" : "warning"} className="fs-12">
                                {h.available_beds} Beds Available
                              </Badge>
                            </td>
                            <td>
                              <span className="text-muted fs-12">
                                {h.latitude && h.longitude ? `${h.latitude}, ${h.longitude}` : "Auto-geocoded"}
                              </span>
                            </td>
                            <td className="text-end">
                              <Button
                                color="soft-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleOpenEditModal(h)}
                              >
                                Edit
                              </Button>
                              <Button
                                color="soft-danger"
                                size="sm"
                                onClick={() => handleDeleteHospital(h.id)}
                              >
                                Delete
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

        {/* Modal for Hospital Add/Edit */}
        <Modal isOpen={modalOpen} toggle={() => setModalOpen(!modalOpen)} centered>
          <ModalHeader toggle={() => setModalOpen(!modalOpen)}>
            {isEditing ? `Edit Hospital: ${selectedHospital?.name}` : "Register New Hospital Facility"}
          </ModalHeader>
          <ModalBody>
            <div className="mb-3">
              <Label htmlFor="hName" className="form-label">Hospital Name</Label>
              <Input
                id="hName"
                type="text"
                placeholder="e.g. Apollo Speciality Emergency"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <Label htmlFor="hAddress" className="form-label">Address & Landmark</Label>
              <Input
                id="hAddress"
                type="text"
                placeholder="Street address, city"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <Row>
              <Col md={6}>
                <div className="mb-3">
                  <Label htmlFor="hContact" className="form-label">Emergency Phone</Label>
                  <Input
                    id="hContact"
                    type="text"
                    placeholder="+91 44 2000 0001 (Demo)"
                    value={formData.contact}
                    onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <Label htmlFor="hBeds" className="form-label">Available ICU/ER Beds</Label>
                  <Input
                    id="hBeds"
                    type="number"
                    min="0"
                    value={formData.available_beds}
                    onChange={(e) => setFormData({ ...formData, available_beds: e.target.value })}
                  />
                </div>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <div className="mb-3">
                  <Label htmlFor="hLat" className="form-label">Latitude (Optional)</Label>
                  <Input
                    id="hLat"
                    type="number"
                    step="any"
                    placeholder="12.9716"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  />
                </div>
              </Col>
              <Col md={6}>
                <div className="mb-3">
                  <Label htmlFor="hLng" className="form-label">Longitude (Optional)</Label>
                  <Input
                    id="hLng"
                    type="number"
                    step="any"
                    placeholder="77.5946"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  />
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleSaveHospital}>
              {isEditing ? "Update Hospital" : "Register Hospital"}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default Hospitals;
