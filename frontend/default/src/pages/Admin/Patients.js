import React, { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Table, Card, CardBody, CardHeader, Col, Row, Badge } from 'reactstrap';

const Patients = () => {
    document.title = "Patients | AI Medical System";
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/admin/patients`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setPatients(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching patients:', err);
            setError(true);
            setPatients([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const triageColor = (triage) => {
        if (triage === 'Red') return 'danger';
        if (triage === 'Orange') return 'warning';
        return 'info';
    };

    const statusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'admitted') return 'success';
        if (s === 'travelling') return 'info';
        return 'warning';
    };

    const ambulanceTypeColor = (type) => {
        if (type === 'ICU') return 'danger';
        if (type === 'Advanced') return 'warning';
        return 'info';
    };

    const initials = (name) => {
        if (!name) return 'PT';
        return name
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(n => n[0].toUpperCase())
            .join('');
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Row>
                    <Col>
                        <Card>
                            <CardHeader>
                                <h4 className="card-title mb-0 fs-3">All Patients</h4>
                            </CardHeader>
                            <CardBody>
                                {loading ? (
                                    <div className="text-center py-5">
                                        <Spinner color="primary" size="lg" />
                                        <p className="text-muted mt-3 fs-5">Loading patients...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-5">
                                        <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                                        </div>
                                        <h5 className="text-danger">Unable to Load Patients</h5>
                                        <p className="text-muted">Please check your connection and try again.</p>
                                    </div>
                                ) : patients.length === 0 ? (
                                    <div className="text-center py-5">
                                        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>👤</span>
                                        </div>
                                        <h5 className="text-muted">No Patients Found</h5>
                                        <p className="text-muted">No patients have been registered yet.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table className="table-nowrap align-middle mb-0">
                                            <thead>
                                                <tr>
                                                    <th scope="col">ID</th>
                                                    <th scope="col">Patient</th>
                                                    <th scope="col">Age</th>
                                                    <th scope="col">Gender</th>
                                                    <th scope="col">Contact</th>
                                                    <th scope="col">Triage</th>
                                                    <th scope="col">Ambulance Type</th>
                                                    <th scope="col">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {patients.map((patient) => (
                                                    <tr key={patient.id}>
                                                        <td>
                                                            <span className="fw-semibold">#{patient.id}</span>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className={`avatar-sm rounded-circle bg-${triageColor(patient.patient_triage)}-subtle d-flex align-items-center justify-content-center me-2`}>
                                                                    <span className={`text-${triageColor(patient.patient_triage)} fw-semibold`}>
                                                                        {initials(patient.name)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="fw-medium">{patient.name}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span>{patient.age}</span>
                                                        </td>
                                                        <td>
                                                            <span>{patient.gender}</span>
                                                        </td>
                                                        <td>
                                                            <span className="text-muted">{patient.contact || 'N/A'}</span>
                                                        </td>
                                                        <td>
                                                            <Badge className={`bg-${triageColor(patient.patient_triage)}-subtle text-${triageColor(patient.patient_triage)}`}>
                                                                {patient.patient_triage}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <Badge className={`bg-${ambulanceTypeColor(patient.ambulance_type)}-subtle text-${ambulanceTypeColor(patient.ambulance_type)}`}>
                                                                {patient.ambulance_type}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <Badge className={`bg-${statusColor(patient.patient_status)}-subtle text-${statusColor(patient.patient_status)}`}>
                                                                {patient.patient_status}
                                                            </Badge>
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
}

export default Patients;

