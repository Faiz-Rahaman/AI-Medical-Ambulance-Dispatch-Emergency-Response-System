import axios from "axios";

// Create an Axios instance with the backend URL
const API = axios.create({ baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000"});

// API call to the triage endpoint
export const triageCase = (formData) =>
  API.post("/triage/", formData);

// API call to the local LLM chat endpoint (LM Studio)
export const sendChatToLLM = (message,sessionId) =>
  API.post("/llm-chat/",{message,session_id:sessionId});

// Maps API calls
export const getNearestAmbulanceRoute = (patientLat, patientLon, ambulanceType) =>
  API.get(`/maps/nearest-ambulance?patient_lat=${patientLat}&patient_lon=${patientLon}&ambulance_type=${ambulanceType}`);

export const updateAmbulanceLocation = (ambulanceId, latitude, longitude, currentLocation) =>
  API.post(`/maps/update-ambulance-location/${ambulanceId}`, {
    latitude,
    longitude,
    current_location: currentLocation
  });

export const getAmbulancesWithCoordinates = () =>
  API.get("/maps/ambulances-with-coordinates");