import React, { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Table, Card, CardBody, CardHeader, Col, Row } from 'reactstrap';

const Cases = () => {
    document.title = "All Cases | AI Medical System";
    const [recentCases, setRecentCases] = useState([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [casesError, setCasesError] = useState(false);

    const fetchRecentCases = useCallback(async () => {
        setCasesLoading(true);
        setCasesError(false);
        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/triage/all-recent`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            const data = await res.json();
            setRecentCases(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching recent cases:', err);
            setCasesError(true);
            setRecentCases([]);
        } finally {
            setCasesLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecentCases();
    }, [fetchRecentCases]);

    const triageColor = (level) => {
        if (level === 'Emergency') return 'danger';
        if (level === 'Transport') return 'warning';
        return 'info';
    };

    const statusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'pending') return 'warning';
        if (s === 'in progress') return 'info';
        return 'success';
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
                                <h4 className="card-title mb-0 fs-3">All Cases</h4>
                            </CardHeader>
                            <CardBody>
                                {casesLoading ? (
                                    <div className="text-center py-5">
                                        <Spinner color="primary" size="lg" />
                                        <p className="text-muted mt-3 fs-5">Loading recent cases...</p>
                                    </div>
                                ) : casesError ? (
                                    <div className="text-center py-5">
                                        <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                                        </div>
                                        <h5 className="text-danger">Unable to Load Cases</h5>
                                        <p className="text-muted">Please check your connection and try again.</p>
                                    </div>
                                ) : recentCases.length === 0 ? (
                                    <div className="text-center py-5">
                                        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>📋</span>
                                        </div>
                                        <h5 className="text-muted">No Recent Cases</h5>
                                        <p className="text-muted">No emergency cases have been recorded yet.</p>
                                    </div>
                                ) : (
                                    <Row className="g-4">
                                        {recentCases.map((caseData, idx) => (
                                            <Col xl={4} md={6} key={idx}>
                                                <Card className="h-100 shadow-sm" style={{ borderLeft: `4px solid var(--vz-${triageColor(caseData.triage_level)})` }}>
                                                    <CardBody>
                                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                                            <div className="d-flex align-items-center gap-3">
                                                                <div className={`avatar-sm rounded-circle bg-${triageColor(caseData.triage_level)}-subtle d-flex align-items-center justify-content-center`}>
                                                                    <span className={`text-${triageColor(caseData.triage_level)} fw-semibold`}>{initials(caseData.patient_name)}</span>
                                                                </div>
                                                                <div>
                                                                    <h4 className="mb-1 fs-5">Case #{caseData.id}</h4>
                                                                    <div className="text-muted fs-6">{caseData.patient_name ? <span className="fw-semibold me-1">{caseData.patient_name}</span> : null}{caseData.age ? <span className="me-1">• {caseData.age}</span> : null}{caseData.gender ? <span>• {caseData.gender}</span> : null}</div>
                                                                </div>
                                                            </div>
                                                            <div className="d-flex gap-2">
                                                                <span className={`badge rounded-pill bg-${triageColor(caseData.triage_level)}-subtle text-${triageColor(caseData.triage_level)} fs-6`}>{caseData.triage_level}</span>
                                                                <span className={`badge rounded-pill bg-${statusColor(caseData.status)}-subtle text-${statusColor(caseData.status)} fs-6`}>{caseData.status}</span>
                                                            </div>
                                                        </div>

                                                        {caseData.location ? (
                                                            <div className="mb-2">
                                                                <span className="badge bg-light text-dark fs-6"><i className="ri-map-pin-2-line align-middle me-1"></i>{caseData.location}</span>
                                                            </div>
                                                        ) : null}

                                                        {caseData.symptoms ? (
                                                            <div className="mt-2">
                                                                <div className="text-muted text-uppercase small fw-medium mb-1">Symptoms</div>
                                                                <div className="text-truncate fs-6" style={{ maxWidth: '100%' }}>{caseData.symptoms}</div>
                                                            </div>
                                                        ) : null}

                                                        <div className="d-flex justify-content-end mt-3">
                                                            <a href="#" className="btn btn-sm btn-soft-primary">
                                                                <i className="ri-eye-line align-middle me-1"></i> View Details
                                                            </a>
                                                        </div>
                                                    </CardBody>
                                                </Card>
                                            </Col>
                                        ))}
                                    </Row>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
}

export default Cases;