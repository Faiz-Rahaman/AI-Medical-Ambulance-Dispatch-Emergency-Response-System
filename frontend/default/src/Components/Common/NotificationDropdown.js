import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Col, Dropdown, DropdownMenu, DropdownToggle, Nav, NavItem, NavLink, Row, TabContent, TabPane } from 'reactstrap';
import { Link, useNavigate } from 'react-router-dom';
import classnames from 'classnames';
import SimpleBar from "simplebar-react";

import bell from "../../assets/images/svg/bell.svg";
import {
    getCustomNotifications,
    getReadNotificationIds,
    markNotificationAsRead,
    markAllNotificationsAsRead
} from '../../utils/notificationService';

const NotificationDropdown = () => {
    const navigate = useNavigate();
    const [isNotificationDropdown, setIsNotificationDropdown] = useState(false);
    const [activeTab, setActiveTab] = useState('1');
    const [recentCases, setRecentCases] = useState([]);
    const [customNotifs, setCustomNotifs] = useState([]);
    const [readIds, setReadIds] = useState(getReadNotificationIds());

    const toggleNotificationDropdown = () => {
        setIsNotificationDropdown(!isNotificationDropdown);
    };

    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
        }
    };

    // Fetch real recent cases from API
    const fetchCases = useCallback(async () => {
        try {
            const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/triage/all-recent`);
            if (res.ok) {
                const data = await res.json();
                setRecentCases(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error('Error fetching notifications cases:', err);
        }
    }, []);

    // Refresh custom notifications from localStorage
    const refreshCustomNotifs = useCallback(() => {
        setCustomNotifs(getCustomNotifications());
        setReadIds(getReadNotificationIds());
    }, []);

    useEffect(() => {
        fetchCases();
        refreshCustomNotifs();

        // Listen for real-time notification events
        const handleNewNotif = () => {
            refreshCustomNotifs();
            fetchCases();
        };

        const handleReadUpdated = () => {
            setReadIds(getReadNotificationIds());
        };

        window.addEventListener('ambulance_notification', handleNewNotif);
        window.addEventListener('ambulance_notifications_read_updated', handleReadUpdated);

        // Poll every 15 seconds to catch new cases or status changes
        const interval = setInterval(() => {
            fetchCases();
        }, 15000);

        return () => {
            window.removeEventListener('ambulance_notification', handleNewNotif);
            window.removeEventListener('ambulance_notifications_read_updated', handleReadUpdated);
            clearInterval(interval);
        };
    }, [fetchCases, refreshCustomNotifs]);

    // Build notifications list from real cases & custom events
    const allNotifications = useMemo(() => {
        const notifs = [...customNotifs];

        // Process cases from database
        recentCases.forEach((c) => {
            const caseId = c.id;
            const patientName = c.patient_name || 'Emergency Patient';
            const location = c.location || 'Chennai GPS Coordinates';
            const triage = c.triage_level || 'Emergency';
            const ambType = c.ambulance_type || 'Basic';
            const status = (c.status || '').toLowerCase();

            // 1. Ambulance Reached Notification (for completed or in-progress cases)
            if (status === 'completed') {
                notifs.push({
                    id: `case-reached-${caseId}`,
                    category: 'dispatch',
                    title: `Ambulance Reached - Case #${caseId}`,
                    description: `Ambulance reached ${patientName}'s location in Chennai. Emergency admission completed.`,
                    badgeText: 'Reached',
                    badgeColor: 'success',
                    icon: 'ri-checkbox-circle-line',
                    iconBg: 'bg-success-subtle text-success',
                    time: 'Mission Completed',
                    link: '/cases',
                    sortOrder: caseId * 10 + 3
                });
            }

            // 2. Ambulance Dispatched Notification
            if (status === 'assigned' || status === 'completed' || status === 'in progress' || status === 'travelling') {
                notifs.push({
                    id: `case-dispatched-${caseId}`,
                    category: 'dispatch',
                    title: `Ambulance Dispatched for Case #${caseId}`,
                    description: `${ambType} Ambulance en route to ${patientName} at ${location}.`,
                    badgeText: 'Dispatched',
                    badgeColor: 'primary',
                    icon: 'ri-truck-line',
                    iconBg: 'bg-primary-subtle text-primary',
                    time: 'En Route',
                    link: '/cases',
                    sortOrder: caseId * 10 + 2
                });
            }

            // 3. Case Created Notification
            notifs.push({
                id: `case-created-${caseId}`,
                category: 'case',
                title: `Emergency Case #${caseId} Created`,
                description: `Patient: ${patientName} (${c.age ? c.age + ' yrs, ' : ''}${c.gender || ''}) - Triage: ${triage} (${ambType} Ambulance requested).`,
                badgeText: triage === 'Emergency' ? 'Critical' : 'Triage Logged',
                badgeColor: triage === 'Emergency' ? 'danger' : 'warning',
                icon: 'ri-alarm-warning-line',
                iconBg: triage === 'Emergency' ? 'bg-danger-subtle text-danger' : 'bg-warning-subtle text-warning',
                time: 'Case Logged',
                link: '/cases',
                sortOrder: caseId * 10 + 1
            });
        });

        // Add a system fleet update notice if no or few notifications
        notifs.push({
            id: 'system-fleet-active',
            category: 'case',
            title: 'Chennai Ambulance Fleet Active',
            description: '20 ambulance units stationed across Chennai hubs. Standby response ready.',
            badgeText: 'Fleet Ready',
            badgeColor: 'info',
            icon: 'ri-shield-check-line',
            iconBg: 'bg-info-subtle text-info',
            time: 'Active',
            link: '/admin/ambulances',
            sortOrder: 0
        });

        // Sort: custom notifications first, then highest sortOrder (newest cases)
        return notifs.sort((a, b) => (b.sortOrder || 999) - (a.sortOrder || 999));
    }, [recentCases, customNotifs]);

    // Derived tab lists
    const dispatchNotifications = useMemo(() => {
        return allNotifications.filter(n => n.category === 'dispatch');
    }, [allNotifications]);

    const caseNotifications = useMemo(() => {
        return allNotifications.filter(n => n.category === 'case');
    }, [allNotifications]);

    // Unread count
    const unreadCount = useMemo(() => {
        return allNotifications.filter(n => !readIds.includes(n.id)).length;
    }, [allNotifications, readIds]);

    const handleItemClick = (notif) => {
        markNotificationAsRead(notif.id);
        setReadIds(getReadNotificationIds());
        setIsNotificationDropdown(false);
        if (notif.link) {
            navigate(notif.link);
        }
    };

    const handleMarkAllRead = () => {
        const allIds = allNotifications.map(n => n.id);
        markAllNotificationsAsRead(allIds);
        setReadIds(allIds);
    };

    // Render helper for an individual notification item
    const renderNotificationItem = (notif) => {
        const isRead = readIds.includes(notif.id);
        return (
            <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                className={`text-reset notification-item d-block dropdown-item position-relative py-2 px-3 border-bottom ${!isRead ? 'bg-light-subtle' : ''}`}
                style={{ cursor: 'pointer' }}
            >
                <div className="d-flex align-items-start">
                    <div className="avatar-xs me-3 flex-shrink-0">
                        <span className={`avatar-title rounded-circle fs-16 ${notif.iconBg}`}>
                            <i className={notif.icon}></i>
                        </span>
                    </div>
                    <div className="flex-grow-1">
                        <div className="d-flex align-items-center justify-content-between mb-1">
                            <h6 className="mt-0 mb-0 fs-13 fw-semibold text-truncate" style={{ maxWidth: '210px' }}>
                                {notif.title}
                            </h6>
                            {notif.badgeText && (
                                <span className={`badge bg-${notif.badgeColor}-subtle text-${notif.badgeColor} fs-11`}>
                                    {notif.badgeText}
                                </span>
                            )}
                        </div>
                        <div className="fs-12 text-muted mb-1">
                            <p className="mb-0 text-truncate-2-lines" style={{ lineHeight: '1.4' }}>
                                {notif.description}
                            </p>
                        </div>
                        <div className="d-flex align-items-center justify-content-between">
                            <p className="mb-0 fs-11 fw-medium text-muted">
                                <span><i className="mdi mdi-clock-outline me-1"></i>{notif.timeDisplay || notif.time}</span>
                            </p>
                            {!isRead && (
                                <span className="badge badge-dot bg-primary" title="Unread" style={{ width: '7px', height: '7px', borderRadius: '50%' }}></span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <React.Fragment>
            <Dropdown isOpen={isNotificationDropdown} toggle={toggleNotificationDropdown} className="topbar-head-dropdown ms-1 header-item">
                <DropdownToggle type="button" tag="button" className="btn btn-icon btn-topbar btn-ghost-secondary rounded-circle position-relative" title="Notifications">
                    <i className='bx bx-bell fs-22'></i>
                    {unreadCount > 0 && (
                        <span className="position-absolute topbar-badge fs-10 translate-middle badge rounded-pill bg-danger">
                            {unreadCount > 9 ? '9+' : unreadCount}
                            <span className="visually-hidden">unread notifications</span>
                        </span>
                    )}
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-lg dropdown-menu-end p-0 shadow-lg" style={{ minWidth: '340px' }}>
                    <div className="dropdown-head bg-primary bg-pattern rounded-top">
                        <div className="p-3">
                            <Row className="align-items-center">
                                <Col>
                                    <h6 className="m-0 fs-16 fw-semibold text-white">
                                        <i className="ri-notification-3-line align-middle me-1"></i> Notifications
                                    </h6>
                                </Col>
                                <div className="col-auto dropdown-tabs d-flex align-items-center gap-2">
                                    {unreadCount > 0 ? (
                                        <span className="badge bg-light-subtle text-body fs-12">{unreadCount} New</span>
                                    ) : (
                                        <span className="badge bg-light-subtle text-body fs-12">All Read</span>
                                    )}
                                    {unreadCount > 0 && (
                                        <button
                                            type="button"
                                            onClick={handleMarkAllRead}
                                            className="btn btn-sm btn-link text-white-50 p-0 text-decoration-underline fs-11"
                                            title="Mark all as read"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </Row>
                        </div>

                        <div className="px-2 pt-2">
                            <Nav className="nav-tabs dropdown-tabs nav-tabs-custom">
                                <NavItem>
                                    <NavLink
                                        href="#"
                                        className={classnames({ active: activeTab === '1' })}
                                        onClick={(e) => { e.preventDefault(); toggleTab('1'); }}
                                    >
                                        All ({allNotifications.length})
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        href="#"
                                        className={classnames({ active: activeTab === '2' })}
                                        onClick={(e) => { e.preventDefault(); toggleTab('2'); }}
                                    >
                                        Dispatches ({dispatchNotifications.length})
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink
                                        href="#"
                                        className={classnames({ active: activeTab === '3' })}
                                        onClick={(e) => { e.preventDefault(); toggleTab('3'); }}
                                    >
                                        Cases ({caseNotifications.length})
                                    </NavLink>
                                </NavItem>
                            </Nav>
                        </div>
                    </div>

                    <TabContent activeTab={activeTab}>
                        {/* Tab 1: All Notifications */}
                        <TabPane tabId="1" className="p-0">
                            <SimpleBar style={{ maxHeight: "320px" }}>
                                {allNotifications.length > 0 ? (
                                    allNotifications.map(renderNotificationItem)
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="avatar-md mx-auto mb-3">
                                            <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                                                <i className="ri-notification-off-line"></i>
                                            </div>
                                        </div>
                                        <p className="text-muted mb-0">No notifications available</p>
                                    </div>
                                )}
                            </SimpleBar>
                            <div className="p-2 border-top text-center bg-light">
                                <Link to="/cases" onClick={() => setIsNotificationDropdown(false)} className="btn btn-sm btn-soft-primary w-100">
                                    View All Cases & Dispatches <i className="ri-arrow-right-line align-middle ms-1"></i>
                                </Link>
                            </div>
                        </TabPane>

                        {/* Tab 2: Dispatches & Arrivals */}
                        <TabPane tabId="2" className="p-0">
                            <SimpleBar style={{ maxHeight: "320px" }}>
                                {dispatchNotifications.length > 0 ? (
                                    dispatchNotifications.map(renderNotificationItem)
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="avatar-md mx-auto mb-3">
                                            <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                                                <i className="ri-truck-line"></i>
                                            </div>
                                        </div>
                                        <p className="text-muted mb-0">No ambulance dispatch notifications yet</p>
                                    </div>
                                )}
                            </SimpleBar>
                            <div className="p-2 border-top text-center bg-light">
                                <Link to="/cases" onClick={() => setIsNotificationDropdown(false)} className="btn btn-sm btn-soft-primary w-100">
                                    View Live Dispatch Status <i className="ri-arrow-right-line align-middle ms-1"></i>
                                </Link>
                            </div>
                        </TabPane>

                        {/* Tab 3: Cases & Triage Alerts */}
                        <TabPane tabId="3" className="p-0">
                            <SimpleBar style={{ maxHeight: "320px" }}>
                                {caseNotifications.length > 0 ? (
                                    caseNotifications.map(renderNotificationItem)
                                ) : (
                                    <div className="text-center p-4">
                                        <div className="avatar-md mx-auto mb-3">
                                            <div className="avatar-title bg-light text-primary rounded-circle fs-24">
                                                <i className="ri-alert-line"></i>
                                            </div>
                                        </div>
                                        <p className="text-muted mb-0">No case alerts yet</p>
                                    </div>
                                )}
                            </SimpleBar>
                            <div className="p-2 border-top text-center bg-light">
                                <Link to="/cases" onClick={() => setIsNotificationDropdown(false)} className="btn btn-sm btn-soft-primary w-100">
                                    View All Emergency Cases <i className="ri-arrow-right-line align-middle ms-1"></i>
                                </Link>
                            </div>
                        </TabPane>
                    </TabContent>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default NotificationDropdown;