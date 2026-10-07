import React, { useState, useEffect } from 'react';
import GoogleMapsRoute from './GoogleMapsRoute';
import { MapPin, Clock, Truck, Droplet, Users, Phone, RefreshCw } from 'react-feather';

const AmbulanceRoute = ({ patientLat, patientLon, ambulanceType, onRouteLoaded }) => {
  console.log('AmbulanceRoute component rendering with props:', {
    patientLat,
    patientLon,
    ambulanceType,
    onRouteLoaded: typeof onRouteLoaded
  });

  const [routeData, setRouteData] = useState(null);
  const [ambulanceInfo, setAmbulanceInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Validate required props
  if (!patientLat || !patientLon || !ambulanceType) {
    return (
      <div className="alert alert-warning">
        <h5>Missing Information</h5>
        <p>Patient coordinates or ambulance type is missing.</p>
        <p>Patient: {patientLat ? '✅' : '❌'} {patientLon ? '✅' : '❌'}</p>
        <p>Ambulance Type: {ambulanceType || 'Missing'}</p>
      </div>
    );
  }

  useEffect(() => {
    if (patientLat && patientLon && ambulanceType) {
      fetchAmbulanceRoute();
    }
  }, [patientLat, patientLon, ambulanceType]);

  const fetchAmbulanceRoute = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching ambulance route with params:', {
        patientLat,
        patientLon,
        ambulanceType
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/maps/nearest-ambulance?patient_lat=${patientLat}&patient_lon=${patientLon}&ambulance_type=${ambulanceType}`
      );

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Route data received:', data);
      setRouteData(data.route);
      setAmbulanceInfo(data.ambulance);
      
      // Call the callback if provided
      if (onRouteLoaded) {
        onRouteLoaded(data);
      }
    } catch (err) {
      console.error('Error fetching ambulance route:', err);
      setError(err.message || 'Failed to fetch ambulance route');
      
      // Set fallback data to prevent complete failure
      setRouteData({
        duration: 'Unknown',
        distance: 'Unknown',
        polyline: '',
        api_status: 'error'
      });
      setAmbulanceInfo({
        vehicle_number: 'Unknown',
        type_of_ambulance: ambulanceType,
        current_location: 'Unknown',
        no_of_staffs: 2,
        fuel_level: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="d-flex align-items-center justify-content-center py-4">
            <div className="spinner-border text-primary me-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <span className="text-muted">Finding nearest ambulance and calculating route...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-4">
            <div className="text-danger mb-3">
              <Truck size={48} className="mx-auto" />
            </div>
            <h5 className="card-title text-danger mb-2">Error Loading Route</h5>
            <p className="text-muted mb-4">{error}</p>
            <button 
              onClick={fetchAmbulanceRoute}
              className="btn btn-primary"
            >
              <RefreshCw size={16} className="me-2" />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!routeData || !ambulanceInfo) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center py-4">
            <div className="text-muted mb-3">
              <Truck size={48} className="mx-auto" />
            </div>
            <h5 className="card-title text-muted mb-2">No Route Available</h5>
            <p className="text-muted">Unable to find a route at this time.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="row">
      {/* Route Map */}
      <div className="col-12 mb-4">
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0 d-flex align-items-center">
              <MapPin size={20} className="me-2 text-primary" />
              Route to Patient
            </h5>
          </div>
          <div className="card-body p-0">
            <GoogleMapsRoute
              patientLat={patientLat}
              patientLon={patientLon}
              ambulanceLat={ambulanceInfo.latitude}
              ambulanceLon={ambulanceInfo.longitude}
              routeData={routeData}
              ambulanceInfo={ambulanceInfo}
              className="w-100"
            />
          </div>
        </div>
      </div>

      {/* Ambulance Information */}
      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h5 className="card-title mb-0 d-flex align-items-center">
              <Truck size={20} className={`me-2 ${ambulanceInfo.status === 'standby' || ambulanceInfo.vehicle_number?.includes('DEMO') ? 'text-warning' : 'text-success'}`} />
              {ambulanceInfo.status === 'standby' || ambulanceInfo.vehicle_number?.includes('DEMO') ? 'Standby Reserve Unit' : 'Assigned Ambulance'}
            </h5>
          </div>
          <div className="card-body">
            {(ambulanceInfo.status === 'standby' || ambulanceInfo.vehicle_number?.includes('DEMO')) && (
              <div className="alert alert-warning mb-3 d-flex align-items-start" role="alert">
                <div className="me-2 fs-5">⚠️</div>
                <div>
                  <strong className="d-block">Priority Queue - Standby Unit Alerted</strong>
                  <span className="text-muted small">All immediate local units are currently busy. Your case is at the top of the priority queue, and a standby reserve ambulance has been alerted.</span>
                </div>
              </div>
            )}
            <div className="row">
              {/* Ambulance Details */}
              <div className="col-md-6 mb-4">
                <div className="bg-light rounded p-3">
                  <h6 className="fw-semibold mb-3">Vehicle Information</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td className="text-muted">Vehicle Number:</td>
                          <td className="fw-medium">{ambulanceInfo.vehicle_number}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Type:</td>
                          <td className="fw-medium text-capitalize">{ambulanceInfo.type_of_ambulance}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Status:</td>
                          <td>
                            <span className={`badge fw-medium ${
                              ambulanceInfo.status === 'available' ? 'bg-success' : 
                              ambulanceInfo.status === 'dispatch' ? 'bg-primary' : 
                              ambulanceInfo.status === 'standby' ? 'bg-warning text-dark' : 'bg-secondary'
                            }`}>
                              {ambulanceInfo.status === 'standby' ? 'Standby (Queued)' : ambulanceInfo.status}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-light rounded p-3 mt-3">
                  <h6 className="fw-semibold mb-3">Crew & Resources</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td className="text-muted d-flex align-items-center">
                            <Users size={16} className="me-1" />
                            Staff:
                          </td>
                          <td className="fw-medium">{ambulanceInfo.no_of_staffs} members</td>
                        </tr>
                        <tr>
                          <td className="text-muted d-flex align-items-center">
                            <Droplet size={16} className="me-1" />
                            Fuel Level:
                          </td>
                          <td className="fw-medium">{ambulanceInfo.fuel_level}%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Route Information */}
              <div className="col-md-6 mb-4">
                <div className="bg-primary bg-opacity-10 rounded p-3">
                  <h6 className="fw-semibold mb-3 d-flex align-items-center">
                    <Clock size={16} className="me-2 text-primary" />
                    Route Details
                  </h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td className="text-muted">Estimated Time:</td>
                          <td className="fw-medium text-success">{routeData.duration}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Distance:</td>
                          <td className="fw-medium">{routeData.distance}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Straight Distance:</td>
                          <td className="fw-medium">{routeData.straight_line_distance_km} km</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-light rounded p-3 mt-3">
                  <h6 className="fw-semibold mb-3">Location</h6>
                  <div className="table-responsive">
                    <table className="table table-sm table-borderless">
                      <tbody>
                        <tr>
                          <td className="text-muted">Current Location:</td>
                          <td className="fw-medium small">{ambulanceInfo.current_location}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Coordinates:</td>
                          <td className="fw-medium small">
                            {ambulanceInfo.latitude.toFixed(4)}, {ambulanceInfo.longitude.toFixed(4)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="row mt-3">
              <div className="col-md-6 mb-2">
                <button 
                  onClick={fetchAmbulanceRoute}
                  className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center"
                >
                  <MapPin size={16} className="me-2" />
                  Refresh Route
                </button>
              </div>
              <div className="col-md-6 mb-2">
                <a
                  href="tel:+16089013032"
                  className="btn btn-success w-100 d-flex align-items-center justify-content-center text-white"
                  title="Call VAPI AI Dispatch (+1 608-901-3032)"
                >
                  <Phone size={16} className="me-2" />
                  Contact Crew (VAPI AI)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmbulanceRoute;
