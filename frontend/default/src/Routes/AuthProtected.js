import React, { useEffect } from "react";
import { Navigate, Route } from "react-router-dom";
import { setAuthorization, getLoggedinUser } from "../helpers/api_helper";
import { useDispatch } from "react-redux";

import { useProfile } from "../Components/Hooks/UserHooks";

import { logoutUser } from "../slices/auth/login/thunk";

const AuthProtected = (props) => {
  const dispatch = useDispatch();
  const user = getLoggedinUser();
  const token = user?.token;

  useEffect(() => {
    if (token) {
      setAuthorization(token);
    }
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <>{props.children}</>;
};

const AccessRoute = ({ component: Component, ...rest }) => {
  return (
    <Route
      {...rest}
      render={props => {
        return (<> <Component {...props} /> </>);
      }}
    />
  );
};

export { AuthProtected, AccessRoute };