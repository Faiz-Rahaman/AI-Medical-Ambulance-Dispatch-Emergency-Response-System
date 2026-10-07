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

const Users = () => {
  document.title = "User Management | Admin Panel";

  const [users, setUsers] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: "", type: "success" });

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    hospital_id: "",
    is_active: 1,
  });

  const currentUser = getLoggedinUser();
  const token = currentUser?.token;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error loading users:", err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchHospitals = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/admin/hospitals`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setHospitals(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading hospitals:", err);
    }
  }, [token]);

  useEffect(() => {
    setLoading(true);
    fetchUsers();
    fetchHospitals();
  }, [fetchUsers, fetchHospitals]);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setSelectedUser(null);
    setFormData({
      name: "",
      email: "",
      password: "",
      role: "user",
      hospital_id: "",
      is_active: 1,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (u) => {
    setIsEditing(true);
    setSelectedUser(u);
    setFormData({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      hospital_id: u.hospital_id || "",
      is_active: u.is_active,
    });
    setModalOpen(true);
  };

  const handleSaveUser = async () => {
    try {
      if (!formData.name || !formData.email) {
        setFeedbackMsg({ text: "Name and Email are required", type: "danger" });
        return;
      }

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing
        ? `${API_URL}/admin/users/${selectedUser.id}`
        : `${API_URL}/admin/users`;

      const payload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        hospital_id: formData.hospital_id ? parseInt(formData.hospital_id) : null,
        is_active: formData.is_active,
      };
      if (formData.password) {
        payload.password = formData.password;
      }

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
        throw new Error(data.detail || "Failed to save user");
      }

      setFeedbackMsg({
        text: isEditing ? "User updated successfully!" : "New user created successfully!",
        type: "success",
      });
      setModalOpen(false);
      fetchUsers();
      setTimeout(() => setFeedbackMsg({ text: "", type: "success" }), 4000);
    } catch (err) {
      setFeedbackMsg({ text: err.message, type: "danger" });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setFeedbackMsg({ text: "User deleted successfully", type: "success" });
        fetchUsers();
        setTimeout(() => setFeedbackMsg({ text: "", type: "success" }), 4000);
      }
    } catch (err) {
      setFeedbackMsg({ text: "Error deleting user", type: "danger" });
    }
  };

  const getRoleBadge = (role) => {
    if (role === "admin") return <Badge color="danger" className="badge-border">ADMINISTRATOR</Badge>;
    if (role === "hospital") return <Badge color="primary" className="badge-border">HOSPITAL STAFF</Badge>;
    return <Badge color="success" className="badge-border">CITIZEN / USER</Badge>;
  };

  return (
    <div className="page-content">
      <Container fluid>
        <BreadCrumb title="User Management" pageTitle="Admin Panel" />

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
                  <h5 className="card-title mb-0">System Users ({users.length})</h5>
                  <span className="text-muted fs-12">Manage access credentials and role assignments</span>
                </div>
                <Button color="success" onClick={handleOpenCreateModal}>
                  <i className="ri-user-add-line me-1"></i> Add New User
                </Button>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" />
                    <p className="mt-2 text-muted">Loading user accounts...</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table-hover align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>ID</th>
                          <th>Full Name</th>
                          <th>Email Address</th>
                          <th>Role</th>
                          <th>Hospital Affiliation</th>
                          <th>Account Status</th>
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id}>
                            <td className="fw-semibold text-primary">#{u.id}</td>
                            <td>
                              <div className="d-flex align-items-center">
                                <div className="avatar-xs me-2">
                                  <span className="avatar-title bg-light text-primary rounded-circle">
                                    {u.name?.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <span className="fw-semibold text-dark">{u.name}</span>
                              </div>
                            </td>
                            <td>{u.email}</td>
                            <td>{getRoleBadge(u.role)}</td>
                            <td>
                              {u.hospital_name ? (
                                <span className="badge bg-light text-dark border">
                                  <i className="ri-hospital-line me-1 text-primary"></i>
                                  {u.hospital_name}
                                </span>
                              ) : (
                                <span className="text-muted fs-12">None (Universal)</span>
                              )}
                            </td>
                            <td>
                              {u.is_active ? (
                                <Badge color="success-subtle" className="text-success">Active</Badge>
                              ) : (
                                <Badge color="danger-subtle" className="text-danger">Deactivated</Badge>
                              )}
                            </td>
                            <td className="text-end">
                              <Button
                                color="soft-primary"
                                size="sm"
                                className="me-2"
                                onClick={() => handleOpenEditModal(u)}
                              >
                                Edit
                              </Button>
                              <Button
                                color="soft-danger"
                                size="sm"
                                onClick={() => handleDeleteUser(u.id)}
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

        {/* Create/Edit User Modal */}
        <Modal isOpen={modalOpen} toggle={() => setModalOpen(!modalOpen)} centered>
          <ModalHeader toggle={() => setModalOpen(!modalOpen)}>
            {isEditing ? `Edit User: ${selectedUser?.name}` : "Create New User"}
          </ModalHeader>
          <ModalBody>
            <div className="mb-3">
              <Label htmlFor="userName" className="form-label">Full Name</Label>
              <Input
                id="userName"
                type="text"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <Label htmlFor="userEmail" className="form-label">Email Address</Label>
              <Input
                id="userEmail"
                type="email"
                placeholder="user@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <Label htmlFor="userPassword" className="form-label">
                {isEditing ? "Password (leave blank to keep unchanged)" : "Password"}
              </Label>
              <Input
                id="userPassword"
                type="password"
                placeholder={isEditing ? "••••••••" : "Minimum 6 characters"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            <div className="mb-3">
              <Label htmlFor="userRole" className="form-label">Access Role</Label>
              <Input
                id="userRole"
                type="select"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="user">Citizen / Patient (SOS & Case History)</option>
                <option value="hospital">Hospital Staff (Dispatch & Fleet View)</option>
                <option value="admin">System Administrator (Full Oversight)</option>
              </Input>
            </div>

            {formData.role === "hospital" && (
              <div className="mb-3">
                <Label htmlFor="userHospital" className="form-label">Hospital Affiliation</Label>
                <Input
                  id="userHospital"
                  type="select"
                  value={formData.hospital_id}
                  onChange={(e) => setFormData({ ...formData, hospital_id: e.target.value })}
                >
                  <option value="">Select Hospital...</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </Input>
              </div>
            )}

            <div className="form-check form-switch mt-3">
              <Input
                type="checkbox"
                className="form-check-input"
                id="activeSwitch"
                checked={formData.is_active === 1}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              />
              <Label className="form-check-label" htmlFor="activeSwitch">Account Active & Enabled</Label>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" onClick={handleSaveUser}>
              {isEditing ? "Update User" : "Create User"}
            </Button>
          </ModalFooter>
        </Modal>
      </Container>
    </div>
  );
};

export default Users;
