import React from "react";
import { Navigate } from "react-router-dom";
import { getLoggedinUser } from "../helpers/api_helper";
import RoleProtected from "./RoleProtected";

// Dashboard
import DashboardMedical from "../pages/DashboardMedical";

// Auth
import Login from "../pages/Authentication/Login";
import ForgetPasswordPage from "../pages/Authentication/ForgetPassword";
import Logout from "../pages/Authentication/Logout";
import Register from "../pages/Authentication/Register";
import UserProfile from "../pages/Authentication/user-profile";

// Common Pages
import Medicalchat from "../pages/MedicalChat";
import Cases from "../pages/Cases";

// Admin Pages
import Ambulances from "../pages/Admin/Ambulances";
import Patients from "../pages/Admin/Patients";
import SystemPrompt from "../pages/Admin/SystemPrompt";
import Users from "../pages/Admin/Users";
import Hospitals from "../pages/Admin/Hospitals";

// Hospital Portal Pages
import IncomingCases from "../pages/Hospital/IncomingCases";
import FleetStatus from "../pages/Hospital/FleetStatus";
import PatientTracking from "../pages/Hospital/PatientTracking";

// User / Citizen Portal Pages
import EmergencySOS from "../pages/User/EmergencySOS";
import MyCases from "../pages/User/MyCases";
import TrackAmbulance from "../pages/User/TrackAmbulance";

// Smart Landing based on logged-in user role
const RootRedirect = () => {
  const user = getLoggedinUser();
  if (!user || !user.token) {
    return <Navigate to="/login" replace />;
  }
  if (user.role === "hospital") {
    return <Navigate to="/hospital/cases" replace />;
  }
  if (user.role === "user") {
    return <Navigate to="/user/emergency" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

const authProtectedRoutes = [
  // === ALL AUTHENTICATED ROLES ===
  { path: "/dashboard", component: <DashboardMedical /> },
  { path: "/medical-chat", component: <Medicalchat /> },
  { path: "/profile", component: <UserProfile /> },

  // === ADMIN PORTAL (Admin only) ===
  {
    path: "/admin/ambulances",
    component: (
      <RoleProtected allowedRoles={["admin"]}>
        <Ambulances />
      </RoleProtected>
    ),
  },
  {
    path: "/admin/patients",
    component: (
      <RoleProtected allowedRoles={["admin"]}>
        <Patients />
      </RoleProtected>
    ),
  },
  {
    path: "/admin/system-prompt",
    component: (
      <RoleProtected allowedRoles={["admin"]}>
        <SystemPrompt />
      </RoleProtected>
    ),
  },
  {
    path: "/admin/users",
    component: (
      <RoleProtected allowedRoles={["admin"]}>
        <Users />
      </RoleProtected>
    ),
  },
  {
    path: "/admin/hospitals",
    component: (
      <RoleProtected allowedRoles={["admin"]}>
        <Hospitals />
      </RoleProtected>
    ),
  },
  {
    path: "/cases",
    component: (
      <RoleProtected allowedRoles={["admin", "hospital"]}>
        <Cases />
      </RoleProtected>
    ),
  },

  // === HOSPITAL PORTAL (Hospital & Admin) ===
  {
    path: "/hospital/cases",
    component: (
      <RoleProtected allowedRoles={["hospital", "admin"]}>
        <IncomingCases />
      </RoleProtected>
    ),
  },
  {
    path: "/hospital/fleet",
    component: (
      <RoleProtected allowedRoles={["hospital", "admin"]}>
        <FleetStatus />
      </RoleProtected>
    ),
  },
  {
    path: "/hospital/tracking",
    component: (
      <RoleProtected allowedRoles={["hospital", "admin"]}>
        <PatientTracking />
      </RoleProtected>
    ),
  },

  // === CITIZEN / USER PORTAL (User & Admin) ===
  {
    path: "/user/emergency",
    component: (
      <RoleProtected allowedRoles={["user", "admin"]}>
        <EmergencySOS />
      </RoleProtected>
    ),
  },
  {
    path: "/user/my-cases",
    component: (
      <RoleProtected allowedRoles={["user", "admin"]}>
        <MyCases />
      </RoleProtected>
    ),
  },
  {
    path: "/user/track",
    component: (
      <RoleProtected allowedRoles={["user", "admin"]}>
        <TrackAmbulance />
      </RoleProtected>
    ),
  },

  // Fallbacks
  { path: "/", exact: true, component: <RootRedirect /> },
  { path: "*", component: <RootRedirect /> },
];

const publicRoutes = [
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login /> },
  { path: "/forgot-password", component: <ForgetPasswordPage /> },
  { path: "/register", component: <Register /> },
];

export { authProtectedRoutes, publicRoutes };