import React, { useState } from 'react';
import { Card, CardBody, Col, Container, Input, Label, Row, Button, Form, FormFeedback, Alert, Spinner } from 'reactstrap';
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";
import { Link, useNavigate } from "react-router-dom";
import * as Yup from "yup";
import { useFormik } from "formik";
import logoLight from "../../assets/images/logo-light.png";
import { setAuthorization } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const Login = () => {
    document.title = "Sign In | AI Ambulance Dispatch System";
    const navigate = useNavigate();

    const [passwordShow, setPasswordShow] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loginError, setLoginError] = useState("");

    const handleLoginSuccess = (data) => {
        const userData = {
            ...data.user,
            token: data.access_token,
        };
        sessionStorage.setItem("authUser", JSON.stringify(userData));
        localStorage.setItem("authUser", JSON.stringify(userData));
        setAuthorization(data.access_token);

        // Role-based redirect
        if (data.user.role === "hospital") {
            navigate("/hospital/cases");
        } else if (data.user.role === "user") {
            navigate("/user/emergency");
        } else {
            navigate("/dashboard");
        }
    };

    const performLogin = async (email, password) => {
        setLoading(true);
        setLoginError("");
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Invalid login credentials");
            }

            handleLoginSuccess(data);
        } catch (err) {
            setLoginError(err.message || "Failed to connect to backend server");
        } finally {
            setLoading(false);
        }
    };

    const validation = useFormik({
        initialValues: {
            email: "admin@emergency.com",
            password: "admin123",
        },
        validationSchema: Yup.object({
            email: Yup.string().email("Invalid email format").required("Please enter your email"),
            password: Yup.string().required("Please enter your password"),
        }),
        onSubmit: (values) => {
            performLogin(values.email, values.password);
        }
    });

    // Quick demo login shortcuts
    const quickLogin = (email, password) => {
        validation.setFieldValue("email", email);
        validation.setFieldValue("password", password);
        performLogin(email, password);
    };

    return (
        <React.Fragment>
            <ParticlesAuth>
                <div className="auth-page-content mt-lg-5">
                    <Container>
                        <Row>
                            <Col lg={12}>
                                <div className="text-center mt-sm-5 mb-4 text-white-50">
                                    <div>
                                        <Link to="/" className="d-inline-block auth-logo">
                                            <img src={logoLight} alt="AI Medical Dispatch" height="28" />
                                        </Link>
                                    </div>
                                    <p className="mt-3 fs-15 fw-medium text-white">
                                        🚨 AI-Powered Smart Ambulance Dispatch & Triage System
                                    </p>
                                </div>
                            </Col>
                        </Row>

                        <Row className="justify-content-center">
                            <Col md={8} lg={6} xl={5}>
                                <Card className="mt-2 shadow-lg border-0">
                                    <CardBody className="p-4">
                                        <div className="text-center mt-2">
                                            <h5 className="text-primary fs-18">Welcome Back!</h5>
                                            <p className="text-muted">Sign in to access your role-specific emergency portal.</p>
                                        </div>

                                        {loginError && (
                                            <Alert color="danger" className="mt-3">
                                                <i className="ri-error-warning-line me-2"></i>
                                                {loginError}
                                            </Alert>
                                        )}

                                        <div className="p-2 mt-2">
                                            <Form onSubmit={validation.handleSubmit}>
                                                <div className="mb-3">
                                                    <Label htmlFor="email" className="form-label">Email Address</Label>
                                                    <Input
                                                        id="email"
                                                        name="email"
                                                        className="form-control"
                                                        placeholder="Enter your email"
                                                        type="email"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.email}
                                                        invalid={validation.touched.email && !!validation.errors.email}
                                                    />
                                                    {validation.touched.email && validation.errors.email && (
                                                        <FormFeedback type="invalid">{validation.errors.email}</FormFeedback>
                                                    )}
                                                </div>

                                                <div className="mb-3">
                                                    <Label className="form-label" htmlFor="password-input">Password</Label>
                                                    <div className="position-relative auth-pass-inputgroup mb-3">
                                                        <Input
                                                            id="password-input"
                                                            name="password"
                                                            value={validation.values.password}
                                                            type={passwordShow ? "text" : "password"}
                                                            className="form-control pe-5"
                                                            placeholder="Enter password"
                                                            onChange={validation.handleChange}
                                                            onBlur={validation.handleBlur}
                                                            invalid={validation.touched.password && !!validation.errors.password}
                                                        />
                                                        {validation.touched.password && validation.errors.password && (
                                                            <FormFeedback type="invalid">{validation.errors.password}</FormFeedback>
                                                        )}
                                                        <button
                                                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted"
                                                            type="button"
                                                            id="password-addon"
                                                            onClick={() => setPasswordShow(!passwordShow)}
                                                        >
                                                            <i className={passwordShow ? "ri-eye-off-fill align-middle" : "ri-eye-fill align-middle"}></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <Button color="primary" className="btn btn-primary w-100" type="submit" disabled={loading}>
                                                        {loading ? <Spinner size="sm" className="me-2" /> : <i className="ri-login-box-line me-1"></i>}
                                                        Sign In
                                                    </Button>
                                                </div>
                                            </Form>

                                            {/* Quick Demo Role Logins */}
                                            <div className="mt-4 pt-2 border-top">
                                                <p className="text-muted text-center fs-12 mb-2 fw-semibold">QUICK DEMO ACCESS (CLICK TO SWITCH ROLE)</p>
                                                <div className="d-grid gap-2">
                                                    <Button
                                                        color="danger"
                                                        outline
                                                        size="sm"
                                                        className="d-flex align-items-center justify-content-between"
                                                        onClick={() => quickLogin("admin@emergency.com", "admin123")}
                                                        disabled={loading}
                                                    >
                                                        <span><i className="ri-shield-keyhole-line me-2 text-danger"></i><strong>Admin Panel</strong></span>
                                                        <span className="badge bg-danger-subtle text-danger">Full Control</span>
                                                    </Button>
                                                    <Button
                                                        color="info"
                                                        outline
                                                        size="sm"
                                                        className="d-flex align-items-center justify-content-between"
                                                        onClick={() => quickLogin("hospital@apollo.com", "hospital123")}
                                                        disabled={loading}
                                                    >
                                                        <span><i className="ri-hospital-line me-2 text-info"></i><strong>Hospital Portal</strong></span>
                                                        <span className="badge bg-info-subtle text-info">Apollo Dispatch</span>
                                                    </Button>
                                                    <Button
                                                        color="success"
                                                        outline
                                                        size="sm"
                                                        className="d-flex align-items-center justify-content-between"
                                                        onClick={() => quickLogin("user@emergency.com", "user123")}
                                                        disabled={loading}
                                                    >
                                                        <span><i className="ri-user-heart-line me-2 text-success"></i><strong>Citizen / User</strong></span>
                                                        <span className="badge bg-success-subtle text-success">SOS & Tracking</span>
                                                    </Button>
                                                </div>
                                            </div>

                                        </div>
                                    </CardBody>
                                </Card>

                                <div className="mt-3 text-center">
                                    <p className="mb-0 text-white-50">
                                        Don't have an account?{" "}
                                        <Link to="/register" className="fw-semibold text-white text-decoration-underline">
                                            Register Here
                                        </Link>
                                    </p>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </ParticlesAuth>
        </React.Fragment>
    );
};

export default Login;