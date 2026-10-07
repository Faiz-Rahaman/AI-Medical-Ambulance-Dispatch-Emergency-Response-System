import React from "react";
import { Navigate } from "react-router-dom";
import { getLoggedinUser } from "../helpers/api_helper";

const RoleProtected = ({ allowedRoles, children }) => {
  const user = getLoggedinUser();

  if (!user || !user.token) {
    return <Navigate to="/login" replace />;
  }

  // If role is required and user's role is not in allowedRoles
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role || "user";
    if (!allowedRoles.includes(userRole)) {
      // If admin, they have global oversight
      if (userRole === "admin") {
        return children;
      }
      // Redirect to appropriate landing based on role
      if (userRole === "hospital") {
        return <Navigate to="/hospital/cases" replace />;
      }
      return <Navigate to="/user/emergency" replace />;
    }
  }

  return children;
};

export default RoleProtected;
