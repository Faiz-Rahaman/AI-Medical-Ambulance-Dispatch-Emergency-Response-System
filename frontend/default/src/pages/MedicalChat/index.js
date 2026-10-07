import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Container, Input, Button, Row, Col, Card, CardBody, Modal, ModalHeader, ModalBody, Spinner } from 'reactstrap';
import { Mic, MicOff, MapPin, Navigation } from 'lucide-react';
import PulseLoader from 'react-spinners/PulseLoader';
import { Table } from 'reactstrap';
import AmbulanceRoute from './components/AmbulanceRoute';
import ErrorBoundary from './components/ErrorBoundary';

const Medicalchat = () => {
    console.log('MedicalChat component initializing...');
    
    // Global error handler - suppress "Script error" messages
    useEffect(() => {
        const handleError = (event) => {
            // Check if it's a "Script error" (cross-origin issue) - suppress these
            if (event.message === 'Script error.' || event.message === 'Script error' || (event.message && event.message.includes('Script error'))) {
                // Suppress the error from being displayed
                event.stopImmediatePropagation();
                event.preventDefault();
                event.stopPropagation();
                // Optionally log to console in development (but silently)
                if (process.env.NODE_ENV === 'development') {
                    console.debug('⚠️ Cross-origin script error suppressed');
                }
                return true; // Prevent default error handling
            }
            
            // For other errors, log them but don't suppress
            const errorInfo = {
                message: event.message || 'Unknown error',
                filename: event.filename || 'Unknown file',
                lineno: event.lineno || 'Unknown line',
                colno: event.colno || 'Unknown column',
                error: event.error,
                stack: event.error?.stack || 'No stack trace'
            };
            
            // Only log non-script errors
            if (errorInfo.message && !errorInfo.message.includes('Script error')) {
                console.error('🚨 Error caught:', errorInfo);
            }
            
            return false; // Let other errors be handled normally
        };
        
        const handleUnhandledRejection = (event) => {
            // Suppress promise rejections that are just "Script error"
            if (event.reason && typeof event.reason === 'string' && event.reason.includes('Script error')) {
                event.preventDefault();
                return;
            }
            
            // Log other rejections
            console.error('🚨 Unhandled promise rejection:', {
                reason: event.reason,
                promise: event.promise,
                stack: event.reason?.stack
            });
        };
        
        // Add error listener with capture phase to catch all errors
        window.addEventListener('error', handleError, true);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);
        
        // Also override console.error to filter out script errors
        const originalConsoleError = console.error;
        console.error = (...args) => {
            const message = args.join(' ');
            if (message.includes('Script error') || message.includes('Script error.')) {
                // Suppress script error messages from console
                return;
            }
            originalConsoleError.apply(console, args);
        };
        
        return () => {
            window.removeEventListener('error', handleError, true);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            // Restore original console.error
            console.error = originalConsoleError;
        };
    }, []);
    
    const [selectedLanguage, setSelectedLanguage] = useState('en');
    
    const LANGUAGE_OPTIONS = [
        { code: 'en', label: 'English', speechCode: 'en-US', greeting: 'Welcome to the Medical Emergency Chat. How can we assist you today?' },
        { code: 'hi', label: 'हिंदी (Hindi)', speechCode: 'hi-IN', greeting: 'मेडिकल इमरजेंसी चैट में आपका स्वागत है। हम आपकी क्या मदद कर सकते हैं?' },
        { code: 'ta', label: 'தமிழ் (Tamil)', speechCode: 'ta-IN', greeting: 'மருத்துவ அவசர அரட்டைக்கு வரவேற்கிறோம். நாங்கள் உங்களுக்கு எப்படி உதவ முடியும்?' },
        { code: 'te', label: 'తెలుగు (Telugu)', speechCode: 'te-IN', greeting: 'మెడికల్ ఎమర్జెన్సీ చాట్‌కి స్వాగతం. మేము మీకు ఎలా సహాయం చేయగలము?' },
        { code: 'es', label: 'Español (Spanish)', speechCode: 'es-ES', greeting: 'Bienvenido al chat de emergencias médicas. ¿Cómo podemos ayudarle hoy?' },
        { code: 'fr', label: 'Français (French)', speechCode: 'fr-FR', greeting: 'Bienvenue sur le chat d\'urgence médicale. Comment pouvons-nous vous aider aujourd\'hui?' },
        { code: 'ar', label: 'العربية (Arabic)', speechCode: 'ar-SA', greeting: 'مرحبًا بك في خدمة محادثة الطوارئ الطبية. كيف يمكننا مساعدتك اليوم؟' },
        { code: 'bn', label: 'বাংলা (Bengali)', speechCode: 'bn-IN', greeting: 'মেডিকেল এমার্জেন্সি চ্যাটে আপনাকে স্বাগতম। আমরা আপনাকে কীভাবে সাহায্য করতে পারি?' },
        { code: 'mr', label: 'मराठी (Marathi)', speechCode: 'mr-IN', greeting: 'वैद्यकीय आणीबाणी चॅटमध्ये आपले स्वागत आहे. आम्ही तुम्हाला कशी मदत करू शकतो?' },
        { code: 'ur', label: 'اردو (Urdu)', speechCode: 'ur-PK', greeting: 'طبی ایمرجنسی چیٹ میں خوش آمدید۔ آج ہم آپ کی کیا مدد کر سکتے ہیں؟' },
    ];

    const [messages, setMessages] = useState([
        { sender: 'system', text: 'Welcome to the Medical Emergency Chat. How can we assist you today?' }
    ]);
    const [input, setInput] = useState('');
    const [sessionId] = useState(() => 'session-' + Math.random().toString(36).substring(2, 15));
    const [isRecording, setIsRecording] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const recognitionRef = useRef(null);
    const transcribedTextRef = useRef('');
    const messagesEndRef = useRef(null);
    // State for Location
    const [location, setLocation] = useState(null);
    // Modal state
    

    // Ambulance sidebar state
    const [ambulanceDetails, setAmbulanceDetails] = useState(null);
    const [ambulanceLoading, setAmbulanceLoading] = useState(false);
    const [showAmbulanceSidebar, setShowAmbulanceSidebar] = useState(false);
    const [showAmbulanceRoute, setShowAmbulanceRoute] = useState(false);
    const [patientCoordinates, setPatientCoordinates] = useState(null);
    const [ambulanceType, setAmbulanceType] = useState('Basic');
    
    // Popup notification state
    const [showLocationPopup, setShowLocationPopup] = useState(false);
    const [locationPopupMessage, setLocationPopupMessage] = useState('');
    const [locationPopupType, setLocationPopupType] = useState('info'); // 'info', 'success', 'error'

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Show initial location prompt popup
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!location) {
                showPopupNotification('📍 For faster emergency response, please click the location button to share your current location.', 'info', 6000);
            }
        }, 2000); // Show after 2 seconds

        return () => clearTimeout(timer);
    }, [location]);

    // Function to show popup notifications
    const showPopupNotification = (message, type = 'info', duration = 3000) => {
        setLocationPopupMessage(message);
        setLocationPopupType(type);
        setShowLocationPopup(true);
        
        setTimeout(() => {
            setShowLocationPopup(false);
        }, duration);
    };

    // Speech recognition setup
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.interimResults = true;
            recognition.continuous = false;
            const currentLang = LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage);
            recognition.lang = currentLang ? currentLang.speechCode : 'en-US';

            recognition.onstart = () => setIsRecording(true);

            recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');
                transcribedTextRef.current = transcript;
                setInput(transcript);
            };

            recognition.onend = () => {
                setIsRecording(false);
                if (transcribedTextRef.current.trim() !== '') {
                    handleSend(transcribedTextRef.current);
                    transcribedTextRef.current = '';
                }
            };

            recognitionRef.current = recognition;
        } else {
            console.warn("Speech Recognition API is not supported in this browser.");
        }
    }, [selectedLanguage]);

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setSelectedLanguage(newLang);
        const opt = LANGUAGE_OPTIONS.find(l => l.code === newLang);
        if (opt) {
            setMessages(prev => [...prev, { sender: 'system', text: `🌐 Language switched to ${opt.label}. ${opt.greeting}` }]);
        }
    };
    const getLiveLocation = () => {
        if (!navigator.geolocation) {
            showPopupNotification('Geolocation is not supported by your browser.', 'error', 4000);
            return;
        }

        // Show loading popup
        showPopupNotification('🔄 Requesting your location...', 'info', 2000);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });
                setPatientCoordinates({ latitude, longitude });
                // Notify user with success popup
                showPopupNotification('✅ Location captured successfully! Your coordinates are now ready for emergency dispatch.', 'success', 4000);
            },
            (error) => {
                console.error('Error getting location:', error);
                let errorMessage = 'Location access was denied. Please allow location access and try again.';
                if (error.code === error.PERMISSION_DENIED) {
                    errorMessage = 'Location access was denied. Please allow location access and try again.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMessage = 'Location information is unavailable. Please try again.';
                } else if (error.code === error.TIMEOUT) {
                    errorMessage = 'Location request timed out. Please try again.';
                }
                showPopupNotification(errorMessage, 'error', 5000);
            }
        );
    };
    // Handle sending message
    const handleSend = async (messageToSend = input) => {
        if (messageToSend.trim() === '') return;
        const userMessage = { sender: 'user', text: messageToSend };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsThinking(true);

        try {
            const res = await fetch(`${process.env.REACT_APP_API_URL}/llm-chat/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: messageToSend,
                    session_id: sessionId,
                    // Send location data if it exists
                    latitude: location ? location.latitude : null,
                    longitude: location ? location.longitude : null,
                    language: selectedLanguage,
                })
            });
            // ... (rest of the handleSend function is unchanged)
            if (!res.ok) {
                throw new Error(`Server error: ${res.status} ${res.statusText}`);
            }

            const contentType = res.headers.get('content-type') || '';
            const data = await res.blob();

            if (contentType.includes('application/json')) {
                const textData = await data.text();
                try {
                    const parsedData = JSON.parse(textData);
                    if (parsedData.response) {
                        setMessages(prev => [...prev, { sender: 'system', text: parsedData.response }]);
                        checkAndTriggerSidebar(parsedData.response);
                    } else {
                        throw new Error('No response text in JSON response');
                    }
                } catch (parseError) {
                    console.error('JSON parse error:', parseError);
                    setMessages(prev => [...prev, { sender: 'system', text: textData || 'Invalid response format' }]);
                }
            } else if (contentType.includes('audio')) {
                const encodedText = res.headers.get('x-llm-response-text');
                if (!encodedText) throw new Error('No response text from server');
                const llmText = decodeURIComponent(encodedText);
                setMessages(prev => [...prev, { sender: 'system', text: llmText }]);
                checkAndTriggerSidebar(llmText);

                const audioUrl = URL.createObjectURL(data);
                const audio = new Audio(audioUrl);
                audio.play();
                audio.onended = () => URL.revokeObjectURL(audioUrl);
            } else {
                const textData = await data.text();
                // ... (rest of the logic)
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { sender: 'system', text: `Error: ${error.message}` }]);
        } finally {
            setIsThinking(false);
        }
    };

    const handleRecordToggle = () => {
        if (isRecording) recognitionRef.current.stop();
        else {
            setInput('');
            recognitionRef.current.start();
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') handleSend(input);
    };

    // Fetch recent cases - wrapped in useCallback to make it stable
    

    // Auto-refresh recent cases when modal is open
     // Re-run when modal opens/closes or fetchRecentCases changes

    // Fetch ambulance details for the current case
    const fetchAmbulanceDetails = async () => {
        console.log("fetchAmbulanceDetails called");
        setAmbulanceLoading(true);
        try {
            console.log("Fetching ambulance details from API...");
            // First try to get the most recent case ID
            const recentCasesRes = await fetch(`${process.env.REACT_APP_API_URL}/triage/all-recent`);
            if (recentCasesRes.ok) {
                const recentCases = await recentCasesRes.json();
                
                // Check if there are any cases at all
                if (!recentCases || recentCases.length === 0) {
                    console.warn("⚠️ No cases found - cannot show ambulance info without a case");
                    setAmbulanceDetails(null); // Set to null to show "no case" message
                    setTimeout(() => {
                        console.log("Opening ambulance sidebar with no case message...");
                        setShowAmbulanceSidebar(true);
                    }, 500);
                    return;
                }
                
                const latestCase = recentCases[0];
                const latestCaseId = latestCase.id;
                console.log("Latest case ID:", latestCaseId);
                console.log("Latest case data:", latestCase);
                
                // Extract patient coordinates from case if available
                if (latestCase.latitude && latestCase.longitude) {
                    const coords = {
                        latitude: parseFloat(latestCase.latitude),
                        longitude: parseFloat(latestCase.longitude)
                    };
                    console.log("Setting patient coordinates from case:", coords);
                    setPatientCoordinates(coords);
                    setLocation(coords); // Also update location state
                } else {
                    console.warn("⚠️ No coordinates found in case data. Latitude:", latestCase.latitude, "Longitude:", latestCase.longitude);
                }
                
                // Get ambulance for this specific case
                const res = await fetch(`${process.env.REACT_APP_API_URL}/triage/case/${latestCaseId}/ambulance`);
                if (res.ok) {
                    const data = await res.json();
                    console.log("Case-specific ambulance data received:", data);
                    console.log("Fuel level from case-specific ambulance:", data.ambulance?.fuel_level);
                    setAmbulanceDetails(data);
                    
                    // Dispatch notification to bell icon
                    try {
                        window.dispatchEvent(new CustomEvent('ambulance_notification', {
                            detail: {
                                id: `amb-dispatch-${latestCaseId}`,
                                title: `Ambulance Dispatched (Case #${latestCaseId})`,
                                description: `${data.ambulance?.type_of_ambulance || 'Emergency'} Ambulance (${data.ambulance?.vehicle_number || ''}) dispatched to ${data.patient_name || 'Patient'}.`,
                                category: 'dispatch',
                                badgeText: 'Dispatched',
                                badgeColor: 'primary',
                                icon: 'ri-truck-line',
                                iconBg: 'bg-primary-subtle text-primary',
                                time: 'Just now',
                                link: '/cases'
                            }
                        }));
                    } catch (notifErr) {
                        console.error('Error dispatching notification:', notifErr);
                    }

                    // Show sidebar with animation after a short delay
                    setTimeout(() => {
                        console.log("Opening ambulance sidebar...");
                        setShowAmbulanceSidebar(true);
                    }, 500);
                    return;
                } else {
                    // Case exists but no ambulance assigned yet
                    console.warn("⚠️ Case exists but no ambulance assigned yet");
                    setAmbulanceDetails(null);
                    setTimeout(() => {
                        console.log("Opening ambulance sidebar - case exists but no ambulance...");
                        setShowAmbulanceSidebar(true);
                    }, 500);
                    return;
                }
            } else {
                // Failed to fetch cases
                console.error("Failed to fetch recent cases");
                setAmbulanceDetails(null);
                setTimeout(() => {
                    console.log("Opening ambulance sidebar - failed to fetch cases...");
                    setShowAmbulanceSidebar(true);
                }, 500);
                return;
            }
        } catch (err) {
            console.error('Error fetching ambulance details:', err);
            // Show sidebar but with error state
            setAmbulanceDetails(null);
            setTimeout(() => {
                console.log("Opening ambulance sidebar with error state...");
                setShowAmbulanceSidebar(true);
            }, 500);
        } finally {
            setAmbulanceLoading(false);
        }
    };

    const toggleAmbulanceSidebar = () => {
        setShowAmbulanceSidebar(!showAmbulanceSidebar);
        if (!showAmbulanceSidebar) {
            fetchAmbulanceDetails();
            // Show route by default when sidebar opens
            setShowAmbulanceRoute(true);
        }
    };

    // Helper function to check if response indicates completion and trigger sidebar
    const checkAndTriggerSidebar = (responseText) => {
        if (responseText && responseText.includes("Thank you, all details have been recorded. Help is on the way.")) {
            console.log("Completion message detected, triggering ambulance sidebar...");
            setTimeout(() => {
                fetchAmbulanceDetails();
                setShowAmbulanceSidebar(true);
            }, 1500);
        }
    };

    return (
        <>
            <style>
                {`
                    @keyframes popIn {
                        0% {
                            transform: scale(0.8) translateY(-20px);
                            opacity: 0;
                        }
                        50% {
                            transform: scale(1.05) translateY(-5px);
                            opacity: 0.8;
                        }
                        100% {
                            transform: scale(1) translateY(0);
                            opacity: 1;
                        }
                    }
                    
                    @keyframes pulse {
                        0% {
                            transform: scale(1);
                            opacity: 1;
                        }
                        50% {
                            transform: scale(1.1);
                            opacity: 0.8;
                        }
                        100% {
                            transform: scale(1);
                            opacity: 1;
                        }
                    }
                    
                    .ambulance-sidebar {
                        position: fixed;
                        top: 0;
                        right: -600px;
                        width: 600px;
                        height: 100vh;
                        background: white;
                        box-shadow: -5px 0 20px rgba(0,0,0,0.15);
                        transition: right 0.3s ease-in-out;
                        z-index: 1050;
                        overflow-y: auto;
                    }
                    
                    .ambulance-sidebar.show {
                        right: 0;
                    }
                    
                    .popup-notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        min-width: 300px;
                        max-width: 400px;
                        padding: 1rem 1.5rem;
                        border-radius: 12px;
                        box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                        z-index: 1060;
                        animation: slideInRight 0.3s ease-out;
                    }
                    
                    .popup-notification.info {
                        background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
                        color: white;
                    }
                    
                    .popup-notification.success {
                        background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%);
                        color: white;
                    }
                    
                    .popup-notification.error {
                        background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
                        color: white;
                    }
                    
                    @keyframes slideInRight {
                        from {
                            transform: translateX(100%);
                            opacity: 0;
                        }
                        to {
                            transform: translateX(0);
                            opacity: 1;
                        }
                    }
                `}
            </style>
            
            {/* Popup Notification */}
            {showLocationPopup && (
                <div className={`popup-notification ${locationPopupType}`}>
                    <div className="d-flex align-items-center">
                        <div className="me-3">
                            {locationPopupType === 'success' && <span style={{ fontSize: '1.5rem' }}>✅</span>}
                            {locationPopupType === 'error' && <span style={{ fontSize: '1.5rem' }}>❌</span>}
                            {locationPopupType === 'info' && <span style={{ fontSize: '1.5rem' }}>ℹ️</span>}
                        </div>
                        <div>
                            <p className="mb-0 fw-semibold">{locationPopupMessage}</p>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="page-content" style={{ background: 'linear-gradient(135deg, #e0eafc 0%, #cfdef3 100%)', minHeight: '100vh' }}>
                <Container fluid>
                    <Row className="justify-content-center mt-4">
                        <Col lg={8} md={10} xs={12}>
                            <Card className="shadow border-0 h-100 d-flex flex-column" style={{ borderRadius: '18px', minHeight: '70vh' }}>
                                <div className="card-header bg-primary text-white d-flex align-items-center justify-content-between flex-wrap gap-2" style={{ borderTopLeftRadius: '18px', borderTopRightRadius: '18px', fontWeight: 600, fontSize: '1.2rem', letterSpacing: '0.5px' }}>
                                    <div className="d-flex align-items-center">
                                        <span style={{ fontSize: '1.7rem', marginRight: 12 }}>🩺</span>
                                        <span>Medical Emergency Chat</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="d-flex align-items-center bg-white text-dark px-2 py-1 rounded-3" style={{ fontSize: '0.9rem' }}>
                                            <span className="me-1">🌐</span>
                                            <select
                                                value={selectedLanguage}
                                                onChange={handleLanguageChange}
                                                className="form-select form-select-sm border-0 bg-transparent shadow-none"
                                                style={{ fontWeight: 600, cursor: 'pointer', outline: 'none' }}
                                            >
                                                {LANGUAGE_OPTIONS.map(lang => (
                                                    <option key={lang.code} value={lang.code}>
                                                        {lang.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <Button color="success" size="sm" onClick={toggleAmbulanceSidebar} style={{ fontWeight: 600 }}>
                                            🚑 Ambulance Info
                                        </Button>
                                    </div>
                                </div>
                                <CardBody className="flex-grow-1 d-flex flex-column p-0" style={{ background: '#f8f9fa', borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px', overflow: 'hidden' }}>
                                    <div className="flex-grow-1 overflow-auto px-3 py-3" style={{ minHeight: 0 }}>
                                        {messages.map((msg, idx) => (
                                            <div key={idx} className={`d-flex mb-3 ${msg.sender === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                                                {msg.sender !== 'user' && (
                                                    <div className="me-2 d-flex align-items-end">
                                                        <div className="bg-light border rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36 }}>
                                                            <span style={{ fontSize: '1.2rem' }}>🩺</span>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className={`p-2 px-3 rounded-3 shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-white text-dark border'}`} style={{ maxWidth: '70%', wordBreak: 'break-word', borderBottomRightRadius: msg.sender === 'user' ? 0 : undefined, borderBottomLeftRadius: msg.sender === 'user' ? undefined : 0 }}>
                                                    {msg.text}
                                                </div>
                                                {msg.sender === 'user' && (
                                                    <div className="ms-2 d-flex align-items-end">
                                                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center" style={{ width: 36, height: 36, fontWeight: 700 }}>
                                                            You
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {isThinking && (
                                            <div className="d-flex mb-3 justify-content-start">
                                                <div className="p-2 px-3 rounded-3 shadow-sm bg-white text-dark border" style={{ maxWidth: '70%', wordBreak: 'break-word', borderBottomLeftRadius: 0 }}>
                                                    <PulseLoader size={8} color="#007bff" />
                                                </div>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>
<div className="card-footer bg-white border-0 d-flex align-items-center gap-2" style={{ borderBottomLeftRadius: '18px', borderBottomRightRadius: '18px', boxShadow: '0 -2px 8px rgba(0,0,0,0.03)' }}>
    {/* 1. Location Button */}
    <Button
        color={location ? "success" : "warning"}
        outline={!location}
        onClick={getLiveLocation}
        className="d-flex align-items-center justify-content-center flex-shrink-0 position-relative"
        style={{ 
            borderRadius: '50%', 
            width: '48px', 
            height: '48px',
            borderWidth: location ? '2px' : '3px',
            animation: location ? 'none' : 'pulse 2s infinite',
            boxShadow: location ? '0 0 0 3px rgba(40, 167, 69, 0.3)' : '0 0 0 3px rgba(255, 193, 7, 0.3)'
        }}
        title={location ? "Location captured ✅" : "Click to share your location for faster emergency response"}
    >
        <MapPin size={20} />
        {location && (
            <div 
                className="position-absolute top-0 start-100 translate-middle"
                style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: '#28a745',
                    borderRadius: '50%',
                    border: '2px solid white',
                    fontSize: '8px'
                }}
            >
                ✓
            </div>
        )}
    </Button>

    {/* 2. Main Text Input */}
    <Input
        type="text"
        placeholder={
            selectedLanguage === 'hi' ? 'अपनी आपातकालीन स्थिति लिखें या बोलें...' :
            selectedLanguage === 'ta' ? 'அவசர தகவலை தட்டச்சு செய்யவும் அல்லது பேசவும்...' :
            selectedLanguage === 'te' ? 'అత్యవసర సమాచారాన్ని టైప్ చేయండి లేదా మాట్లాడండి...' :
            selectedLanguage === 'es' ? 'Escriba o hable su mensaje de emergencia...' :
            selectedLanguage === 'fr' ? 'Écrivez ou dites votre message d\'urgence...' :
            selectedLanguage === 'ar' ? 'اكتب أو تحدث برسالة الطوارئ الخاصة بك...' :
            selectedLanguage === 'bn' ? 'জরুরি বার্তা লিখুন বা বলুন...' :
            selectedLanguage === 'mr' ? 'आपला आपत्कालीन संदेश टाइप करा किंवा बोला...' :
            selectedLanguage === 'ur' ? 'اپنا ہنگامی پیغام ٹائپ کریں یا بولیں...' :
            'Type or speak your emergency message...'
        }
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleInputKeyDown}
        className="me-2"
        style={{ borderRadius: '20px', fontSize: '1rem', padding: '0.7rem 1.2rem' }}
    />
    
    {/* 3. Microphone Button */}
    <Button
        color={isRecording ? 'danger' : 'secondary'}
        onClick={handleRecordToggle}
        className="d-flex align-items-center justify-content-center flex-shrink-0"
        style={{ borderRadius: '50%', width: '48px', height: '48px' }}
    >
        {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
    </Button>

    {/* 4. Send Button */}
    <Button color="primary" onClick={() => handleSend(input)} style={{ borderRadius: '20px', fontWeight: 600, padding: '0.7rem 1.5rem', fontSize: '1rem' }}>Send</Button>
</div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>

                

                {/* Ambulance Details Sidebar */}
                <div className={`ambulance-sidebar ${showAmbulanceSidebar ? 'show' : ''}`}>
                    <div className="d-flex align-items-center justify-content-between p-3 border-bottom" style={{ 
                        background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
                        color: 'white'
                    }}>
                        <div className="d-flex align-items-center">
                            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>🚑</span>
                            <h5 className="mb-0 fw-bold">Ambulance Dispatch</h5>
                        </div>
                        <button 
                            onClick={() => setShowAmbulanceSidebar(false)}
                            className="btn btn-light btn-sm"
                            style={{ borderRadius: '50%', width: '32px', height: '32px', padding: 0 }}
                        >
                            ×
                        </button>
                    </div>
                    
                    <div className="p-3" style={{ background: '#f8f9fa', minHeight: 'calc(100vh - 70px)', overflowY: 'auto' }}>
                        {ambulanceLoading ? (
                            <div className="text-center py-4">
                                <Spinner color="primary" />
                                <p className="text-muted mt-3">Loading ambulance details...</p>
                            </div>
                        ) : ambulanceDetails ? (
                            <>
                                {/* Route Section - Full Sidebar */}
                                {patientCoordinates && (
                                    <div className="h-100">
                                        <ErrorBoundary>
                                            <div 
                                                onError={(error) => {
                                                    console.error('AmbulanceRoute error caught:', error);
                                                    // Suppress the error and show fallback
                                                }}
                                            >
                                                {(() => {
                                                    try {
                                                        return (
                                                            <AmbulanceRoute
                                                                patientLat={patientCoordinates.latitude}
                                                                patientLon={patientCoordinates.longitude}
                                                                ambulanceType={ambulanceDetails?.ambulance?.type_of_ambulance || ambulanceDetails?.patient?.ambulance_type || 'Basic'}
                                                                onRouteLoaded={(data) => {
                                                                    console.log('Route loaded:', data);
                                                                    if (data?.route?.duration) {
                                                                        try {
                                                                            window.dispatchEvent(new CustomEvent('ambulance_notification', {
                                                                                detail: {
                                                                                    id: `route-eta-${Date.now()}`,
                                                                                    title: 'Ambulance En Route with Live ETA',
                                                                                    description: `ETA: ${data.route.duration} (${data.route.distance}) to patient coordinates. Emergency beacons on.`,
                                                                                    category: 'dispatch',
                                                                                    badgeText: 'Active ETA',
                                                                                    badgeColor: 'info',
                                                                                    icon: 'ri-navigation-line',
                                                                                    iconBg: 'bg-info-subtle text-info',
                                                                                    time: 'Just now',
                                                                                    link: '/cases'
                                                                                }
                                                                            }));
                                                                        } catch (e) {
                                                                            console.error(e);
                                                                        }
                                                                    }
                                                                }}
                                                            />
                                                        );
                                                    } catch (error) {
                                                        console.error('AmbulanceRoute render error:', error);
                                                        return (
                                                            <div className="alert alert-warning">
                                                                <h5>Route Loading Error</h5>
                                                                <p>Unable to load route information. Please try again.</p>
                                                            </div>
                                                        );
                                                    }
                                                })()}
                                            </div>
                                        </ErrorBoundary>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-4">
                                <div className="bg-info bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '60px', height: '60px' }}>
                                    <span style={{ fontSize: '1.5rem' }}>📋</span>
                                </div>
                                <h5 className="text-info mb-3">No Active Case</h5>
                                <p className="text-muted mb-3">
                                    No emergency case has been created yet. Please create a case first to view ambulance dispatch information.
                                </p>
                                <p className="text-muted small">
                                    You can create a case by:
                                    <br />
                                    • Using the medical chat below
                                    <br />
                                    • Making a voice call via VAPI
                                    <br />
                                    • Submitting a case form
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </>
    );
};

export default Medicalchat;