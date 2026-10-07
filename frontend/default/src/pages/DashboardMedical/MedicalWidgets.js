import React, { useEffect, useMemo, useState } from 'react';
import CountUp from "react-countup";
import { Link } from 'react-router-dom';
import { Card, CardBody, Col } from 'reactstrap';
// Removed static medicalWidgets; compute from live data

const MedicalWidgets = () => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let isMounted = true;
        const load = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${process.env.REACT_APP_API_URL}/triage/all-recent`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' },
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                if (isMounted) setCases(Array.isArray(data) ? data : []);
            } catch (e) {
                if (isMounted) setCases([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };
        load();
        return () => { isMounted = false; };
    }, []);

    const stats = useMemo(() => {
        const total = cases.length;
        const pending = cases.filter(c => (c.status || '').toLowerCase() === 'pending').length;
        const inProgress = cases.filter(c => (c.status || '').toLowerCase() === 'in progress').length;
        const completed = cases.filter(c => (c.status || '').toLowerCase() === 'completed').length;
        return [
            { id: 1, label: 'Total Cases', counter: total, bgcolor: 'primary', icon: 'bx bx-collection' },
            { id: 2, label: 'Pending', counter: pending, bgcolor: 'warning', icon: 'bx bx-time' },
            { id: 3, label: 'In Progress', counter: inProgress, bgcolor: 'info', icon: 'bx bx-run' },
            { id: 4, label: 'Completed', counter: completed, bgcolor: 'success', icon: 'bx bx-check-circle' },
        ];
    }, [cases]);

    return (
        <React.Fragment>
            {stats.map((item) => (
                <Col xl={3} md={6} key={item.id}>
                    <Card className="card-animate">
                        <CardBody>
                            <div className="d-flex align-items-center">
                                <div className="flex-grow-1 overflow-hidden">
                                    <p className="text-uppercase fw-medium text-muted text-truncate mb-0">{item.label}</p>
                                </div>
                                <div className="flex-shrink-0">
                                    <h5 className="fs-14 mb-0 text-muted">{loading ? '...' : ''}</h5>
                                </div>
                            </div>
                            <div className="d-flex align-items-end justify-content-between mt-4">
                                <div>
                                    <h4 className="fs-22 fw-semibold ff-secondary mb-4">
                                        <span className="counter-value">
                                            <CountUp start={0} end={item.counter} duration={1.2} />
                                        </span>
                                    </h4>
                                    <Link to="/cases" className="text-decoration-underline">View details</Link>
                                </div>
                                <div className="avatar-sm flex-shrink-0">
                                    <span className={"avatar-title rounded fs-3 bg-" + item.bgcolor + "-subtle"}>
                                        <i className={`text-${item.bgcolor} ${item.icon}`}></i>
                                    </span>
                                </div>
                            </div>
                        </CardBody>
                    </Card>
                </Col>
            ))}
        </React.Fragment>
    );
};

export default MedicalWidgets;
