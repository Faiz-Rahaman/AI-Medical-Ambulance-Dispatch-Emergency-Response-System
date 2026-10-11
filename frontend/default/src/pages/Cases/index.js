import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Container,
    Spinner,
    Card,
    CardBody,
    CardHeader,
    Col,
    Row,
    Badge,
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Input,
} from 'reactstrap';
import { useNavigate } from 'react-router-dom';
import { getLoggedinUser } from '../../helpers/api_helper';

const Cases = () => {
    document.title = "All Cases | AI Medical Dispatch";
    const navigate = useNavigate();

    const [recentCases, setRecentCases] = useState([]);
    const [casesLoading, setCasesLoading] = useState(false);
    const [casesError, setCasesError] = useState(false);

    // Modal state for View Details
    const [selectedCase, setSelectedCase] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Search and Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [filterTriage, setFilterTriage] = useState("all");

    // Delete case state
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteModal, setDeleteModal] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const loggedUser = getLoggedinUser();
    const isAdmin = !loggedUser || loggedUser.role === 'admin';

    const confirmDelete = (caseItem) => {
        setDeleteTarget(caseItem);
        setDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const user = getLoggedinUser();
            const headers = { 'Content-Type': 'application/json' };
            if (user?.token) {
                headers['Authorization'] = `Bearer ${user.token}`;
            }
            const res = await fetch(`${process.env.REACT_APP_API_URL}/admin/cases/${deleteTarget.id}`, {
                method: 'DELETE',
                headers,
            });
            if (!res.ok) {
                await fetch(`${process.env.REACT_APP_API_URL}/triage/cases/${deleteTarget.id}`, {
                    method: 'DELETE',
                    headers,
                });
            }
            if (selectedCase && selectedCase.id === deleteTarget.id) {
                setIsModalOpen(false);
                setSelectedCase(null);
            }
            fetchRecentCases();
        } catch (err) {
            console.error('Error deleting case:', err);
        } finally {
            setDeleting(false);
            setDeleteModal(false);
            setDeleteTarget(null);
        }
    };

    const fetchRecentCases = useCallback(async () => {
        setCasesLoading(true);
        setCasesError(false);
        try {
            const user = getLoggedinUser();
            const headers = { 'Content-Type': 'application/json' };
            if (user?.token) {
                headers['Authorization'] = `Bearer ${user.token}`;
            }
            const res = await fetch(`${process.env.REACT_APP_API_URL}/triage/all-recent`, {
                method: 'GET',
                headers,
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
        if (level === 'Emergency' || level === 'Red') return 'danger';
        if (level === 'Transport' || level === 'Orange' || level === 'Yellow') return 'warning';
        return 'info';
    };

    const statusColor = (status) => {
        const s = (status || '').toLowerCase();
        if (s === 'pending') return 'warning';
        if (s === 'in progress' || s === 'assigned' || s === 'travelling') return 'primary';
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

    // Filtered cases
    const filteredCases = useMemo(() => {
        return recentCases.filter((c) => {
            const matchesSearch =
                !searchTerm ||
                String(c.id).includes(searchTerm) ||
                (c.patient_name && c.patient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.location && c.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (c.symptoms && c.symptoms.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesTriage =
                filterTriage === "all" ||
                (c.triage_level && c.triage_level.toLowerCase() === filterTriage.toLowerCase());

            return matchesSearch && matchesTriage;
        });
    }, [recentCases, searchTerm, filterTriage]);

    return (
        <div className="page-content">
            <Container fluid>
                <Row>
                    <Col>
                        <Card className="shadow-sm">
                            <CardHeader className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                                <div>
                                    <h4 className="card-title mb-0 fs-18 fw-bold">All Emergency Incident Cases</h4>
                                    <span className="text-muted fs-12">
                                        Total {recentCases.length} incident records logged in system
                                    </span>
                                </div>

                                <div className="d-flex flex-wrap align-items-center gap-2">
                                    {/* Search Input */}
                                    <div className="position-relative" style={{ minWidth: '220px' }}>
                                        <Input
                                            type="text"
                                            placeholder="🔍 Search case #, patient, address..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="form-control-sm"
                                        />
                                    </div>

                                    {/* Filter Buttons */}
                                    <div className="btn-group btn-group-sm">
                                        <button
                                            type="button"
                                            className={`btn ${filterTriage === "all" ? "btn-primary" : "btn-outline-secondary"}`}
                                            onClick={() => setFilterTriage("all")}
                                        >
                                            All
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${filterTriage === "emergency" ? "btn-danger" : "btn-outline-secondary"}`}
                                            onClick={() => setFilterTriage("emergency")}
                                        >
                                            Emergency
                                        </button>
                                        <button
                                            type="button"
                                            className={`btn ${filterTriage === "clinical" ? "btn-info" : "btn-outline-secondary"}`}
                                            onClick={() => setFilterTriage("clinical")}
                                        >
                                            Clinical
                                        </button>
                                    </div>

                                    <Button color="light" size="sm" onClick={fetchRecentCases} disabled={casesLoading}>
                                        <i className="ri-refresh-line align-middle"></i> Refresh
                                    </Button>
                                </div>
                            </CardHeader>

                            <CardBody>
                                {casesLoading ? (
                                    <div className="text-center py-5">
                                        <Spinner color="primary" size="lg" />
                                        <p className="text-muted mt-3 fs-5">Loading incident cases...</p>
                                    </div>
                                ) : casesError ? (
                                    <div className="text-center py-5">
                                        <div className="bg-danger bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                                        </div>
                                        <h5 className="text-danger">Unable to Load Cases</h5>
                                        <p className="text-muted">Please check your backend connection and try again.</p>
                                        <Button color="primary" size="sm" onClick={fetchRecentCases}>Retry</Button>
                                    </div>
                                ) : filteredCases.length === 0 ? (
                                    <div className="text-center py-5">
                                        <div className="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                            <span style={{ fontSize: '1.5rem' }}>📋</span>
                                        </div>
                                        <h5 className="text-muted">No Matching Cases Found</h5>
                                        <p className="text-muted">Try adjusting your search terms or filters.</p>
                                    </div>
                                ) : (
                                    <Row className="g-4">
                                        {filteredCases.map((caseData) => (
                                            <Col xl={4} md={6} key={caseData.id}>
                                                <Card
                                                    className="h-100 shadow-sm border"
                                                    style={{
                                                        borderLeft: `5px solid var(--vz-${triageColor(caseData.triage_level)})`,
                                                        overflow: 'hidden',
                                                    }}
                                                >
                                                    <CardBody className="d-flex flex-column justify-content-between p-3" style={{ overflow: 'hidden' }}>
                                                        <div>
                                                            {/* Header Row */}
                                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                                <div className="d-flex align-items-center gap-2">
                                                                    <div className={`avatar-xs rounded-circle bg-${triageColor(caseData.triage_level)}-subtle d-flex align-items-center justify-content-center flex-shrink-0`}>
                                                                        <span className={`text-${triageColor(caseData.triage_level)} fw-bold fs-12`}>
                                                                            {initials(caseData.patient_name)}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="mb-0 fs-14 fw-bold">Case #{caseData.id}</h5>
                                                                        <div className="text-muted fs-12">
                                                                            {caseData.patient_name ? <span className="fw-semibold me-1">{caseData.patient_name}</span> : null}
                                                                            {caseData.age ? <span className="me-1">• {caseData.age}y</span> : null}
                                                                            {caseData.gender ? <span>• {caseData.gender}</span> : null}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <div className="d-flex gap-1 flex-shrink-0">
                                                                    <Badge color={triageColor(caseData.triage_level)} className="fs-11">
                                                                        {caseData.triage_level || "Standard"}
                                                                    </Badge>
                                                                    <Badge color={statusColor(caseData.status)} className="fs-11">
                                                                        {caseData.status || "Pending"}
                                                                    </Badge>
                                                                </div>
                                                            </div>

                                                            {/* Location Box - strictly bounded with word-break and line clamp */}
                                                            {caseData.location ? (
                                                                <div
                                                                    className="p-2 mb-2 bg-light rounded text-dark fs-12 border d-flex align-items-start gap-1"
                                                                    style={{
                                                                        maxWidth: '100%',
                                                                        wordBreak: 'break-word',
                                                                        overflowWrap: 'anywhere',
                                                                        overflow: 'hidden',
                                                                        lineHeight: '1.4',
                                                                    }}
                                                                >
                                                                    <i className="ri-map-pin-2-fill text-danger flex-shrink-0 mt-1 fs-13"></i>
                                                                    <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
                                                                        <span
                                                                            className="d-block text-dark fw-medium"
                                                                            style={{
                                                                                display: '-webkit-box',
                                                                                WebkitLineClamp: 2,
                                                                                WebkitBoxOrient: 'vertical',
                                                                                overflow: 'hidden',
                                                                                textOverflow: 'ellipsis',
                                                                            }}
                                                                            title={caseData.location}
                                                                        >
                                                                            {caseData.location}
                                                                        </span>
                                                                        {caseData.latitude && caseData.longitude && (
                                                                            <span className="text-muted fs-11">
                                                                                GPS: {Number(caseData.latitude).toFixed(4)}, {Number(caseData.longitude).toFixed(4)}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="p-2 mb-2 bg-light rounded text-muted fs-12 border">
                                                                    <i className="ri-map-pin-line me-1"></i> Location captured via GPS
                                                                </div>
                                                            )}

                                                            {/* Symptoms Box */}
                                                            {caseData.symptoms && (
                                                                <div className="mb-2">
                                                                    <div className="text-muted text-uppercase fs-11 fw-semibold mb-1">Symptoms</div>
                                                                    <div
                                                                        className="text-dark fs-12"
                                                                        style={{
                                                                            display: '-webkit-box',
                                                                            WebkitLineClamp: 2,
                                                                            WebkitBoxOrient: 'vertical',
                                                                            overflow: 'hidden',
                                                                            textOverflow: 'ellipsis',
                                                                            wordBreak: 'break-word',
                                                                        }}
                                                                        title={caseData.symptoms}
                                                                    >
                                                                        {caseData.symptoms}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Card Footer / View Details & Delete Buttons */}
                                                        <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                                            <span className="text-muted fs-11">
                                                                Unit: <strong>{caseData.ambulance_type || "Advanced"}</strong>
                                                            </span>
                                                            <div className="d-flex gap-2">
                                                                <Button
                                                                    color="primary"
                                                                    outline
                                                                    size="sm"
                                                                    className="px-2 py-1 fs-12"
                                                                    onClick={() => {
                                                                        setSelectedCase(caseData);
                                                                        setIsModalOpen(true);
                                                                    }}
                                                                >
                                                                    <i className="ri-eye-line align-middle me-1"></i> View Details
                                                                </Button>
                                                                {isAdmin && (
                                                                    <Button
                                                                        color="danger"
                                                                        outline
                                                                        size="sm"
                                                                        className="px-2 py-1 fs-12"
                                                                        onClick={() => confirmDelete(caseData)}
                                                                        title="Delete Incident Case"
                                                                    >
                                                                        <i className="ri-delete-bin-line align-middle me-1"></i> Delete
                                                                    </Button>
                                                                )}
                                                            </div>
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

            {/* Case Details Interactive Modal */}
            <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(!isModalOpen)} size="lg" centered>
                <ModalHeader toggle={() => setIsModalOpen(!isModalOpen)} className="bg-light">
                    <div className="d-flex align-items-center gap-2">
                        <i className="ri-file-list-3-line text-primary fs-20"></i>
                        <span className="fw-bold">Incident Case Details #{selectedCase?.id}</span>
                    </div>
                </ModalHeader>
                <ModalBody className="p-4">
                    {selectedCase && (
                        <div>
                            {/* Top Status & Priority Bar */}
                            <div className="d-flex flex-wrap justify-content-between align-items-center p-3 mb-3 rounded bg-light border gap-2">
                                <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted fs-12 text-uppercase fw-semibold">Triage Priority:</span>
                                    <Badge color={triageColor(selectedCase.triage_level)} className="fs-12 px-2 py-1">
                                        {selectedCase.triage_level || "Emergency"}
                                    </Badge>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted fs-12 text-uppercase fw-semibold">Current Status:</span>
                                    <Badge color={statusColor(selectedCase.status)} className="fs-12 px-2 py-1">
                                        {selectedCase.status || "Pending"}
                                    </Badge>
                                </div>
                                <div className="d-flex align-items-center gap-2">
                                    <span className="text-muted fs-12 text-uppercase fw-semibold">Required Fleet:</span>
                                    <Badge color="dark" className="fs-12 px-2 py-1">
                                        {selectedCase.ambulance_type || "Advanced ALS"}
                                    </Badge>
                                </div>
                            </div>

                            <Row className="g-3 mb-3">
                                {/* Patient Overview */}
                                <Col md={6}>
                                    <div className="p-3 border rounded h-100 bg-white shadow-sm">
                                        <h6 className="text-uppercase text-muted fs-11 fw-bold mb-2">
                                            <i className="ri-user-heart-line text-primary me-1"></i> Patient Overview
                                        </h6>
                                        <h5 className="text-dark fw-bold mb-1">
                                            {selectedCase.patient_name || "Anonymous / Unspecified"}
                                        </h5>
                                        <p className="text-muted fs-13 mb-1">
                                            <strong>Age:</strong> {selectedCase.age ? `${selectedCase.age} years` : "N/A"} • <strong>Gender:</strong> {selectedCase.gender || "N/A"}
                                        </p>
                                        <p className="text-muted fs-13 mb-0">
                                            <strong>Emergency Contact:</strong> {selectedCase.contact || "Not provided"}
                                        </p>
                                    </div>
                                </Col>

                                {/* Incident Location & Coordinates */}
                                <Col md={6}>
                                    <div className="p-3 border rounded h-100 bg-white shadow-sm">
                                        <h6 className="text-uppercase text-muted fs-11 fw-bold mb-2">
                                            <i className="ri-map-pin-range-line text-danger me-1"></i> Incident Location
                                        </h6>
                                        <p className="fs-13 text-dark fw-medium mb-1" style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                            {selectedCase.location || "Location recorded via GPS coordinates"}
                                        </p>
                                        {selectedCase.latitude && selectedCase.longitude && (
                                            <div className="mt-2 pt-2 border-top d-flex justify-content-between align-items-center">
                                                <span className="text-muted fs-12">
                                                    GPS: {Number(selectedCase.latitude).toFixed(5)}, {Number(selectedCase.longitude).toFixed(5)}
                                                </span>
                                                <a
                                                    href={`https://www.google.com/maps?q=${selectedCase.latitude},${selectedCase.longitude}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-sm btn-outline-danger py-0 px-2 fs-11"
                                                >
                                                    <i className="ri-external-link-line me-1"></i> Google Maps
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </Col>
                            </Row>

                            {/* Symptoms & Clinical Description */}
                            <div className="p-3 border rounded bg-white shadow-sm mb-2">
                                <h6 className="text-uppercase text-muted fs-11 fw-bold mb-2">
                                    <i className="ri-stethoscope-line text-info me-1"></i> Reported Symptoms & Medical Assessment
                                </h6>
                                <div className="p-3 bg-light rounded text-dark fs-13" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {selectedCase.symptoms || "Immediate medical assistance requested. Emergency team alerted."}
                                </div>
                            </div>
                        </div>
                    )}
                </ModalBody>
                <ModalFooter className="d-flex justify-content-between bg-light">
                    <div className="d-flex gap-2">
                        {selectedCase?.id && (
                            <Button
                                color="primary"
                                size="sm"
                                onClick={() => {
                                    setIsModalOpen(false);
                                    navigate(`/user/track?caseId=${selectedCase.id}`);
                                }}
                            >
                                <i className="ri-navigation-fill me-1"></i> Open Live Radar / Tracking
                            </Button>
                        )}
                        {isAdmin && selectedCase && (
                            <Button
                                color="danger"
                                outline
                                size="sm"
                                onClick={() => confirmDelete(selectedCase)}
                                title="Delete Incident Case"
                            >
                                <i className="ri-delete-bin-line me-1"></i> Delete Case
                            </Button>
                        )}
                    </div>
                    <Button color="secondary" size="sm" onClick={() => setIsModalOpen(false)}>
                        Close
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Delete Case Confirmation Modal */}
            <Modal isOpen={deleteModal} toggle={() => setDeleteModal(false)} centered>
                <ModalHeader toggle={() => setDeleteModal(false)} className="bg-danger text-white">
                    <i className="ri-delete-bin-line me-1"></i> Confirm Delete Incident Case
                </ModalHeader>
                <ModalBody className="p-4">
                    <p className="fs-14 mb-2">
                        Are you sure you want to delete <strong>Case #{deleteTarget?.id}</strong>
                        {deleteTarget?.patient_name ? ` (Patient: ${deleteTarget.patient_name})` : ''}?
                    </p>
                    <div className="alert alert-warning py-2 mb-0 fs-12">
                        <i className="ri-alert-line me-1"></i>
                        This will permanently remove the incident case from the database.
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" size="sm" onClick={() => setDeleteModal(false)} disabled={deleting}>
                        Cancel
                    </Button>
                    <Button color="danger" size="sm" onClick={handleDelete} disabled={deleting}>
                        {deleting ? (
                            <>
                                <Spinner size="sm" className="me-1" /> Deleting...
                            </>
                        ) : (
                            <>
                                <i className="ri-delete-bin-line me-1"></i> Delete Case
                            </>
                        )}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default Cases;