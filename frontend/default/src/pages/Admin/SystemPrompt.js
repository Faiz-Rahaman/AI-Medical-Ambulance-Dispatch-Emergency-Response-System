import React, { useEffect, useState, useCallback } from "react";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
  Form,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const SystemPrompt = () => {
  document.title = "System Prompt | AI Medical System";

  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [updatedAt, setUpdatedAt] = useState(null);

  const fetchPrompt = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-prompt`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      setPrompt(data.prompt || "");
      setUpdatedAt(data.updated_at || null);
    } catch (err) {
      console.error("Error fetching system prompt:", err);
      setError("Unable to load the current prompt. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrompt();
  }, [fetchPrompt]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!prompt.trim()) {
      setError("Prompt cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/admin/system-prompt`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to update prompt");
      }

      const data = await res.json();
      setPrompt(data.prompt || "");
      setUpdatedAt(data.updated_at || null);
      setSuccess("Prompt updated successfully.");
    } catch (err) {
      console.error("Error updating system prompt:", err);
      setError(err.message || "Unable to update prompt. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Row>
          <Col lg={12}>
            <Card>
              <CardHeader>
                <h4 className="card-title mb-0 fs-3">Medical Chat System Prompt</h4>
                <p className="text-muted mb-0">
                  Update the instructions that power the AI medical assistant. Changes affect new chat sessions immediately.
                </p>
              </CardHeader>
              <CardBody>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner color="primary" size="lg" />
                    <p className="text-muted mt-3 fs-5">Loading current prompt...</p>
                  </div>
                ) : (
                  <Form onSubmit={handleSubmit}>
                    {error && (
                      <Alert color="danger" toggle={() => setError("")}>
                        {error}
                      </Alert>
                    )}
                    {success && (
                      <Alert color="success" toggle={() => setSuccess("")}>
                        {success}
                      </Alert>
                    )}
                    <div className="mb-4">
                      <Label htmlFor="systemPrompt" className="form-label fw-semibold">
                        Prompt Content <span className="text-danger">*</span>
                      </Label>
                      <Input
                        type="textarea"
                        id="systemPrompt"
                        rows="18"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Enter the system prompt used by the AI medical assistant..."
                      />
                      {updatedAt && (
                        <small className="text-muted d-block mt-2">
                          Last updated: {new Date(updatedAt).toLocaleString()}
                        </small>
                      )}
                    </div>
                    <div className="d-flex gap-3">
                      <Button color="primary" type="submit" disabled={saving}>
                        {saving ? (
                          <>
                            <Spinner size="sm" className="me-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <i className="ri-save-line align-middle me-1"></i>
                            Save Prompt
                          </>
                        )}
                      </Button>
                      <Button color="secondary" type="button" outline onClick={fetchPrompt} disabled={saving}>
                        <i className="ri-refresh-line align-middle me-1"></i>
                        Reset Changes
                      </Button>
                    </div>
                  </Form>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SystemPrompt;

