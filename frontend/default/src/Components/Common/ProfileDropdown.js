import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, Badge } from 'reactstrap';
import { getLoggedinUser } from '../../helpers/api_helper';

const ProfileDropdown = () => {
    const [userData, setUserData] = useState({
        name: "Admin",
        email: "admin@emergency.com",
        role: "admin",
        hospital_name: null,
    });

    useEffect(() => {
        const user = getLoggedinUser();
        if (user) {
            setUserData({
                name: user.name || "User",
                email: user.email || "",
                role: user.role || "user",
                hospital_name: user.hospital_name || null,
            });
        }
    }, []);

    // Dropdown Toggle
    const [isProfileDropdown, setIsProfileDropdown] = useState(false);
    const toggleProfileDropdown = () => {
        setIsProfileDropdown(!isProfileDropdown);
    };

    const getRoleTitle = (role) => {
        if (role === "admin") return "System Administrator";
        if (role === "hospital") return userData.hospital_name || "Hospital Staff";
        return "Citizen / Patient";
    };

    const getRoleBadge = (role) => {
        if (role === "admin") return <Badge color="danger-subtle" className="text-danger ms-1">Admin</Badge>;
        if (role === "hospital") return <Badge color="primary-subtle" className="text-primary ms-1">Hospital</Badge>;
        return <Badge color="success-subtle" className="text-success ms-1">Citizen</Badge>;
    };

    return (
        <React.Fragment>
            <Dropdown isOpen={isProfileDropdown} toggle={toggleProfileDropdown} className="ms-sm-3 header-item topbar-user">
                <DropdownToggle tag="button" type="button" className="btn">
                    <span className="d-flex align-items-center">
                        <div className="rounded-circle header-profile-user bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center text-primary" style={{ width: '34px', height: '34px' }}>
                            <i className="ri-shield-user-line fs-18"></i>
                        </div>
                        <span className="text-start ms-xl-2">
                            <span className="d-none d-xl-inline-block ms-1 fw-semibold user-name-text">
                                {userData.name}
                                {getRoleBadge(userData.role)}
                            </span>
                            <span className="d-none d-xl-block ms-1 fs-11 text-muted user-name-sub-text">
                                {getRoleTitle(userData.role)}
                            </span>
                        </span>
                    </span>
                </DropdownToggle>
                <DropdownMenu className="dropdown-menu-end">
                    <h6 className="dropdown-header">Logged in as {userData.name}</h6>
                    <div className="px-3 py-1 text-muted fs-11 border-bottom mb-2">
                        {userData.email}
                    </div>
                    <DropdownItem className='p-0'>
                        <Link to="/profile" className="dropdown-item">
                            <i className="mdi mdi-account-circle text-muted fs-16 align-middle me-1"></i>
                            <span className="align-middle">My Profile</span>
                        </Link>
                    </DropdownItem>
                    {userData.role === "admin" && (
                        <DropdownItem className='p-0'>
                            <Link to="/admin/users" className="dropdown-item">
                                <i className="mdi mdi-account-multiple-outline text-muted fs-16 align-middle me-1"></i>
                                <span className="align-middle">User Management</span>
                            </Link>
                        </DropdownItem>
                    )}
                    <div className="dropdown-divider"></div>
                    <DropdownItem className='p-0'>
                        <Link to="/logout" className="dropdown-item text-danger">
                            <i className="mdi mdi-logout text-danger fs-16 align-middle me-1"></i>
                            <span className="align-middle" data-key="t-logout">Log Out</span>
                        </Link>
                    </DropdownItem>
                </DropdownMenu>
            </Dropdown>
        </React.Fragment>
    );
};

export default ProfileDropdown;