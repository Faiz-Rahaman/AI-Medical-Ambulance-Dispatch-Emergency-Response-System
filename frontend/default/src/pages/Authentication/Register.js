import React, { useState, useEffect } from "react";
import { Row, Col, CardBody, Card, Alert, Container, Input, Label, Form, FormFeedback, Button, Spinner } from "reactstrap";
import * as Yup from "yup";
import { useFormik } from "formik";
import { Link, useNavigate } from "react-router-dom";
import logoLight from "../../assets/images/logo-light.png";
import ParticlesAuth from "../AuthenticationInner/ParticlesAuth";
import { setAuthorization } from "../../helpers/api_helper";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const Register = () => {
    document.title = "Register | AI Ambulance Dispatch System";
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [registerError, setRegisterError] = useState("");
    const [hospitals, setHospitals] = useState([]);
    const [passwordShow, setPasswordShow] = useState(false);

    useEffect(() => {
        // Fetch hospitals for dropdown if available
        fetch(`${API_URL}/user/nearby-hospitals`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setHospitals(data);
            })
            .catch(() => {});
    }, []);

    const validation = useFormik({
        initialValues: {
            name: "",
            email: "",
            password: "",
            role: "user",
            hospital_id: "",
        },
        validationSchema: Yup.object({
            name: Yup.string().required("Please enter your full name"),
            email: Yup.string().email("Invalid email format").required("Please enter your email"),
            password: Yup.string().min(6, "Password must be at least 6 characters").required("Please enter your password"),
            role: Yup.string().required("Please select your role"),
        }),
        onSubmit: async (values) => {
            setLoading(true);
            setRegisterError("");
            try {
                const payload = {
                    name: values.name.trim(),
                    email: values.email.trim().toLowerCase(),
                    password: values.password,
                    role: values.role,
                    hospital_id: values.role === "hospital" && values.hospital_id ? parseInt(values.hospital_id) : null,
                };

                const res = await fetch(`${API_URL}/auth/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });

                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || "Registration failed");
                }

                // Auto-login upon registration
                const userData = {
                    ...data.user,
                    token: data.access_token,
                };
                sessionStorage.setItem("authUser", JSON.stringify(userData));
                localStorage.setItem("authUser", JSON.stringify(userData));
                setAuthorization(data.access_token);

                if (values.role === "hospital") {
                    navigate("/hospital/cases");
                } else if (values.role === "user") {
                    navigate("/user/emergency");
                } else {
                    navigate("/dashboard");
                }
            } catch (err) {
                setRegisterError(err.message || "Failed to register account");
            } finally {
                setLoading(false);
            }
        },
    });

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
                                            <img src={logoLight} alt="" height="28" />
                                        </Link>
                                    </div>
                                    <p className="mt-3 fs-15 fw-medium text-white">Create your AI Emergency System Account</p>
                                </div>
                            </Col>
                        </Row>

                        <Row className="justify-content-center">
                            <Col md={8} lg={6} xl={5}>
                                <Card className="mt-2 shadow-lg border-0">
                                    <CardBody className="p-4">
                                        <div className="text-center mt-2">
                                            <h5 className="text-primary fs-18">Create New Account</h5>
                                            <p className="text-muted">Register to access emergency dispatch tools</p>
                                        </div>

                                        {registerError && (
                                            <Alert color="danger" className="mt-3">
                                                <i className="ri-error-warning-line me-2"></i>
                                                {registerError}
                                            </Alert>
                                        )}

                                        <div className="p-2 mt-2">
                                            <Form onSubmit={validation.handleSubmit}>
                                                <div className="mb-3">
                                                    <Label htmlFor="fullname" className="form-label">Full Name</Label>
                                                    <Input
                                                        id="fullname"
                                                        name="name"
                                                        type="text"
                                                        className="form-control"
                                                        placeholder="Enter your name"
                                                        onChange={validation.handleChange}
                                                        onBlur={validation.handleBlur}
                                                        value={validation.values.name}
                                                        invalid={validation.touched.name && !!validation.errors.name}
                                                    />
                                                    {validation.touched.name && validation.errors.name && (
                                                        <FormFeedback type="invalid">{validation.errors.name}</FormFeedback>
                                                    )}
                                                </div>

                                                <div className="mb-3">
                                                    <Label htmlFor="useremail" className="form-label">Email</Label>
                                                    <Input
                                                        id="useremail"
                                                        name="email"
                                                        type="email"
                                                        className="form-control"
                                                        placeholder="Enter email address"
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
                                                    <Label htmlFor="role-select" className="form-label">Select Account Role</Label>
                                                    <Input
                                                        id="role-select"
                                                        name="role"
                                                        type="select"
                                                        className="form-select"
                                                        onChange={validation.handleChange}
                                                        value={validation.values.role}
                                                    >
                                                        <option value="user">Citizen / Patient (SOS & Case Tracking)</option>
                                                        <option value="hospital">Hospital Staff (Incoming Cases & Fleet)</option>
                                                        <option value="admin">System Administrator (Full Control)</option>
                                                    </Input>
                                                </div>

                                                {validation.values.role === "hospital" && hospitals.length > 0 && (
                                                    <div className="mb-3">
                                                        <Label htmlFor="hospital-select" className="form-label">Assign to Hospital</Label>
                                                        <Input
                                                            id="hospital-select"
                                                            name="hospital_id"
                                                            type="select"
                                                            className="form-select"
                                                            onChange={validation.handleChange}
                                                            value={validation.values.hospital_id}
                                                        >
                                                            <option value="">Select Hospital affiliation...</option>
                                                            {hospitals.map((h) => (
                                                                <option key={h.id} value={h.id}>{h.name}</option>
                                                            ))}
                                                        </Input>
                                                    </div>
                                                )}

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
                                                            onClick={() => setPasswordShow(!passwordShow)}
                                                        >
                                                            <i className={passwordShow ? "ri-eye-off-fill align-middle" : "ri-eye-fill align-middle"}></i>
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="mt-4">
                                                    <Button color="primary" className="btn btn-primary w-100" type="submit" disabled={loading}>
                                                        {loading ? <Spinner size="sm" className="me-2" /> : <i className="ri-user-add-line me-1"></i>}
                                                        Register Account
                                                    </Button>
                                                </div>
                                            </Form>
                                        </div>
                                    </CardBody>
                                </Card>

                                <div className="mt-3 text-center">
                                    <p className="mb-0 text-white-50">
                                        Already have an account?{" "}
                                        <Link to="/login" className="fw-semibold text-white text-decoration-underline">
                                            Sign In
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

export default Register;
