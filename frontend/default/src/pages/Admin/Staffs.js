import React, { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Table, Card, CardBody, CardHeader, Col, Row, Badge } from 'reactstrap';

const Staffs = () => {
    document.title = "Staffs | AI Medical System";
    const [staffs, setStaffs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const fetchStaffs = useCallback(async () => {
        setLoading(true);
        setError(false);
        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/admin/staffs`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setStaffs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching staffs:', err);
            setError(true);
            setStaffs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStaffs();
    }, [fetchStaffs]);

    const statusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'available') return 'success';
        if (s === 'on_call') return 'warning';
        if (s === 'busy') return 'danger';
        if (s === 'on_leave') return 'secondary';
        return 'info';
    };

    const initials = (role) => {
        if (!role) return 'ST';
        return role
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
                                <h4 className="card-title mb-0 fs-3">All Staffs</h4>
                            </CardHeader>
                            <CardBody>
                                {loading ? (
                                    <div className="text-center py-5">
                                        <Spinner color="primary" size="lg" />
                                        <p className="text-muted mt-3 fs-5">Loading staffs...</p>
                                    </div>
                                ) : error ? (
                                    <div className="text-center py-5">
                                        <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                                        </div>
                                        <h5 className="text-danger">Unable to Load Staffs</h5>
                                        <p className="text-muted">Please check your connection and try again.</p>
                                    </div>
                                ) : staffs.length === 0 ? (
                                    <div className="text-center py-5">
                                        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>👨‍⚕️</span>
                                        </div>
                                        <h5 className="text-muted">No Staffs Found</h5>
                                        <p className="text-muted">No staff members have been registered yet.</p>
                                    </div>
                                ) : (
                                    <div className="table-responsive">
                                        <Table className="table-nowrap align-middle mb-0">
                                            <thead>
                                                <tr>
                                                    <th scope="col">ID</th>
                                                    <th scope="col">Staff</th>
                                                    <th scope="col">Role</th>
                                                    <th scope="col">Ambulance ID</th>
                                                    <th scope="col">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {staffs.map((staff) => (
                                                    <tr key={staff.staff_id}>
                                                        <td>
                                                            <span className="fw-semibold">#{staff.staff_id}</span>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="avatar-sm rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center me-2">
                                                                    <span className="text-primary fw-semibold">
                                                                        {initials(staff.role)}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <span className="fw-medium">{staff.role}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <span className="text-muted">{staff.role}</span>
                                                        </td>
                                                        <td>
                                                            {staff.ambulance_id ? (
                                                                <span className="fw-medium">#{staff.ambulance_id}</span>
                                                            ) : (
                                                                <span className="text-muted">N/A</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <Badge className={`bg-${statusColor(staff.staff_status)}-subtle text-${statusColor(staff.staff_status)}`}>
                                                                {staff.staff_status}
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

export default Staffs;

