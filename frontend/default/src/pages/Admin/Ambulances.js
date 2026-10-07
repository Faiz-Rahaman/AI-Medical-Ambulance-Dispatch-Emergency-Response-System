import React, { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Table, Card, CardBody, CardHeader, Col, Row, Badge, Button, Modal, ModalHeader, ModalBody, Form, Input, Label } from 'reactstrap';
import axios from 'axios';

const Ambulances = () => {
    document.title = "Ambulances | AI Medical System";
    const [ambulances, setAmbulances] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [modal, setModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    
    // Form state
    const [formData, setFormData] = useState({
        type_of_ambulance: 'Basic',
        vehicle_number: '',
        no_of_staffs: '',
        current_location: '',
        latitude: '',
        longitude: '',
        status: 'available',
        fuel_level: ''
    });

    const fetchAmbulances = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/admin/ambulances`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setAmbulances(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching ambulances:', err);
            setError(true);
            setAmbulances([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAmbulances();
    }, [fetchAmbulances]);

    const toggle = () => {
        setModal(!modal);
        if (!modal) {
            // Reset form when opening modal
            setFormData({
                type_of_ambulance: 'Basic',
                vehicle_number: '',
                no_of_staffs: '',
                current_location: '',
                latitude: '',
                longitude: '',
                status: 'available',
                fuel_level: ''
            });
            setSubmitError('');
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        setSubmitError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setSubmitError('');

        try {
            // Prepare data for submission
            const submitData = {
                type_of_ambulance: formData.type_of_ambulance,
                vehicle_number: formData.vehicle_number,
                no_of_staffs: parseInt(formData.no_of_staffs),
                current_location: formData.current_location,
                status: formData.status,
                fuel_level: parseInt(formData.fuel_level),
                latitude: formData.latitude ? parseFloat(formData.latitude) : null,
                longitude: formData.longitude ? parseFloat(formData.longitude) : null
            };

            // Validate required fields
            if (!submitData.vehicle_number || !submitData.current_location || !submitData.no_of_staffs || !submitData.fuel_level) {
                setSubmitError('Please fill in all required fields');
                setSubmitting(false);
                return;
            }

            // Validate fuel level range
            if (submitData.fuel_level < 0 || submitData.fuel_level > 100) {
                setSubmitError('Fuel level must be between 0 and 100');
                setSubmitting(false);
                return;
            }

            // Validate staff count
            if (submitData.no_of_staffs < 1) {
                setSubmitError('Number of staffs must be at least 1');
                setSubmitting(false);
                return;
            }

            const response = await axios.post(`${process.env.REACT_APP_API_URL}/admin/ambulances`, submitData, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            // Success - close modal and refresh list
            toggle();
            fetchAmbulances();
        } catch (err) {
            console.error('Error creating ambulance:', err);
            if (err.response && err.response.data && err.response.data.detail) {
                setSubmitError(err.response.data.detail);
            } else {
                setSubmitError('Failed to create ambulance. Please try again.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const statusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'available') return 'success';
        if (s === 'dispatch') return 'warning';
        if (s === 'out_of_services') return 'danger';
        if (s === 'maintenance') return 'info';
        return 'secondary';
    };

    const typeColor = (type) => {
        if (type === 'ICU') return 'danger';
        if (type === 'Advanced') return 'warning';
        return 'info';
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Row>
                    <Col>
                        <Card>
                            <CardHeader className="d-flex justify-content-between align-items-center">
                                <h4 className="card-title mb-0 fs-3">All Ambulances</h4>
                                <Button color="primary" onClick={toggle}>
                                    <i className="ri-add-line align-middle me-1"></i> Add Ambulance
                                </Button>
                            </CardHeader>
                            <CardBody>
                                {loading ? (
                                    <div className="text-center py-5">
                                        <Spinner color="primary" size="lg" />
                                        <p className="text-muted mt-3 fs-5">Loading ambulances...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-5">
                                        <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                                        </div>
                                        <h5 className="text-danger">Unable to Load Ambulances</h5>
                                        <p className="text-muted">Please check your connection and try again.</p>
                                    </div>
                                ) : ambulances.length === 0 ? (
                                    <div className="text-center py-5">
                                        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>🚑</span>
                                        </div>
                                        <h5 className="text-muted">No Ambulances Found</h5>
                                        <p className="text-muted">No ambulances have been registered yet.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table className="table-nowrap align-middle mb-0">
                                            <thead>
                                                <tr>
                                                    <th scope="col">ID</th>
                                                    <th scope="col">Vehicle Number</th>
                                                    <th scope="col">Type</th>
                                                    <th scope="col">Status</th>
                                                    <th scope="col">Location</th>
                                                    <th scope="col">Staff Count</th>
                                                    <th scope="col">Fuel Level</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {ambulances.map((ambulance) => (
                                                    <tr key={ambulance.ambulance_id}>
                                                        <td>
                                                            <span className="fw-semibold">#{ambulance.ambulance_id}</span>
                                                        </td>
                                                        <td>
                                                            <span className="fw-medium">{ambulance.vehicle_number}</span>
                                                        </td>
                                                        <td>
                                                            <Badge className={`bg-${typeColor(ambulance.type_of_ambulance)}-subtle text-${typeColor(ambulance.type_of_ambulance)}`}>
                                                                {ambulance.type_of_ambulance}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <Badge className={`bg-${statusColor(ambulance.status)}-subtle text-${statusColor(ambulance.status)}`}>
                                                                {ambulance.status}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <span className="text-muted">
                                                                <i className="ri-map-pin-2-line align-middle me-1"></i>
                                                                {ambulance.current_location || 'N/A'}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className="fw-medium">{ambulance.no_of_staffs}</span>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="flex-grow-1">
                                                                    <div className="progress" style={{ height: '6px' }}>
                                                                        <div 
                                                                            className={`progress-bar bg-${ambulance.fuel_level > 50 ? 'success' : ambulance.fuel_level > 20 ? 'warning' : 'danger'}`}
                                                                            role="progressbar"
                                                                            style={{ width: `${ambulance.fuel_level}%` }}
                                                                        ></div>
                                                                    </div>
                                                                </div>
                                                                <span className="ms-2 text-muted">{ambulance.fuel_level}%</span>
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
            </Container>

            {/* Add Ambulance Modal */}
            <Modal isOpen={modal} toggle={toggle} centered size="lg">
                <ModalHeader toggle={toggle} className="bg-primary-subtle">
                    Add New Ambulance
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        {submitError && (
                            <div className="alert alert-danger" role="alert">
                                {submitError}
                            </div>
                        )}
                        <Row className="g-3">
                            <Col lg={6}>
                                <Label htmlFor="type_of_ambulance" className="form-label">
                                    Ambulance Type <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    type="select"
                                    name="type_of_ambulance"
                                    id="type_of_ambulance"
                                    value={formData.type_of_ambulance}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="Basic">Basic</option>
                                    <option value="Advanced">Advanced</option>
                                    <option value="ICU">ICU</option>
                                </Input>
                            </Col>
                            <Col lg={6}>
                                <Label htmlFor="vehicle_number" className="form-label">
                                    Vehicle Number <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    name="vehicle_number"
                                    id="vehicle_number"
                                    placeholder="e.g., TN-12-AB-1234"
                                    value={formData.vehicle_number}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Col>
                            <Col lg={6}>
                                <Label htmlFor="no_of_staffs" className="form-label">
                                    Number of Staffs <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    name="no_of_staffs"
                                    id="no_of_staffs"
                                    placeholder="Enter number of staffs"
                                    min="1"
                                    value={formData.no_of_staffs}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Col>
                            <Col lg={6}>
                                <Label htmlFor="fuel_level" className="form-label">
                                    Fuel Level (%) <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    type="number"
                                    name="fuel_level"
                                    id="fuel_level"
                                    placeholder="0-100"
                                    min="0"
                                    max="100"
                                    value={formData.fuel_level}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Col>
                            <Col lg={6}>
                                <Label htmlFor="status" className="form-label">
                                    Status <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    type="select"
                                    name="status"
                                    id="status"
                                    value={formData.status}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="available">Available</option>
                                    <option value="dispatch">Dispatch</option>
                                    <option value="out_of_services">Out of Services</option>
                                    <option value="maintenance">Maintenance</option>
                                </Input>
                            </Col>
                            <Col lg={12}>
                                <Label htmlFor="current_location" className="form-label">
                                    Current Location <span className="text-danger">*</span>
                                </Label>
                                <Input
                                    type="text"
                                    name="current_location"
                                    id="current_location"
                                    placeholder="Enter current location address"
                                    value={formData.current_location}
                                    onChange={handleInputChange}
                                    required
                                />
                            </Col>
                            <Col lg={6}>
                                <Label htmlFor="latitude" className="form-label">
                                    Latitude (Optional)
                                </Label>
                                <Input
                                    type="number"
                                    name="latitude"
                                    id="latitude"
                                    placeholder="e.g., 13.0827"
                                    step="any"
                                    value={formData.latitude}
                                    onChange={handleInputChange}
                                />
                            </Col>
                            <Col lg={6}>
                                <Label htmlFor="longitude" className="form-label">
                                    Longitude (Optional)
                                </Label>
                                <Input
                                    type="number"
                                    name="longitude"
                                    id="longitude"
                                    placeholder="e.g., 80.2707"
                                    step="any"
                                    value={formData.longitude}
                                    onChange={handleInputChange}
                                />
                            </Col>
                        </Row>
                    </ModalBody>
                    <div className="modal-footer">
                        <Button type="button" color="light" onClick={toggle}>
                            Cancel
                        </Button>
                        <Button type="submit" color="primary" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <Spinner size="sm" className="me-2" />
                                    Adding...
                                </>
                            ) : (
                                'Add Ambulance'
                            )}
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
}

export default Ambulances;

