# 🚑 AI Ambulance Dispatch System: Complete Architectural & Technical Guide

This guide provides a comprehensive, end-to-end technical explanation of the AI Medical Ambulance Dispatch System. It covers frontend-backend communication, frontend modules, local LLM integration with LM Studio, clinical Manchester Triage System (MTS) dispatch algorithms, and MySQL database persistence.

---

## Table of Contents
1. [Frontend-Backend API Connection Architecture](#1-frontend-backend-api-connection-architecture)
2. [Frontend Architecture: Core Modules & Components](#2-frontend-architecture-core-modules--components)
3. [LM Studio Local LLM Integration](#3-lm-studio-local-llm-integration)
4. [Triage Routing Using the Manchester Triage System (MTS)](#4-triage-routing-using-the-manchester-triage-system-mts)
5. [Database Architecture & MySQL Workbench Verification Guide](#5-database-architecture--mysql-workbench-verification-guide)

---

## 1. Frontend-Backend API Connection Architecture

### 1.1 Connection Overview
The frontend (React 18 Single Page Application) communicates with the backend (FastAPI asynchronous REST API) over HTTP/JSON using two coordinated networking layers:
1. **Axios Client (`src/helpers/api_helper.js`)**: Configured with global base URL, request interceptors, and response interceptors.
2. **Native Asynchronous `fetch` Calls**: Used across modern pages for direct payload handling and binary audio streaming (Text-to-Speech).

```
┌────────────────────────────────┐            HTTP / REST (JSON)            ┌───────────────────────────────┐
│     React 18 Frontend          │ ───────────────────────────────────────>  │     FastAPI Backend           │
│  (Port 3000 via npm start)     │ <───────────────────────────────────────  │ (Port 8000 via Uvicorn)       │
│                                │       Authorization: Bearer <JWT>         │                               │
│  - Axios Client & Native Fetch │                                           │  - CORS Middleware Enabled    │
│  - Session Storage Auth State  │                                           │  - JWT Bearer Authentication  │
└────────────────────────────────┘                                           └───────────────────────────────┘
```

### 1.2 Environment Configuration
The API host address is centralized in `frontend/default/.env`:
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaSyDfbW9mQkNYaEGpvTxfqFR3oK6zLwyoKfw
```
In `src/config.js`, this environment variable is exposed to application components:
```javascript
module.exports = {
  api: {
    API_URL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  }
};
```

### 1.3 JWT Authentication & Header Injection
When a user logs in, the backend returns a JWT token along with user profile metadata (`role`, `email`, `name`). The frontend persists this in browser `sessionStorage` under `authUser`.

Every outgoing request dynamically attaches the Bearer token:
```javascript
// From src/helpers/api_helper.js
const token = JSON.parse(sessionStorage.getItem("authUser"))?.token;
if (token) {
    axios.defaults.headers.common["Authorization"] = "Bearer " + token;
}

// In standard page fetch calls:
const user = getLoggedinUser();
const headers = {
    'Content-Type': 'application/json',
    ...(user?.token ? { 'Authorization': `Bearer ${user.token}` } : {})
};
const res = await fetch(`${process.env.REACT_APP_API_URL}/triage/all-recent`, { headers });
```

### 1.4 Backend Cross-Origin Resource Sharing (CORS)
To allow requests between `http://localhost:3000` and `http://localhost:8000`, the FastAPI entry point (`backend/app/main.py`) applies `CORSMiddleware`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 2. Frontend Architecture: Core Modules & Components

The frontend is structured into modular portals based on user roles (`admin`, `hospital`, `user`):

```
frontend/default/src/
├── Routes/
│   ├── allRoutes.js          # Route mapping & Role access control
│   └── RoleProtected.js      # Route guard redirecting unauthorized users
├── pages/
│   ├── MedicalChat/          # AI conversational triage & voice consultation
│   ├── DashboardMedical/     # Live Operations Dashboard, KPIs & fleet map
│   ├── Cases/                # Incident records management & deletion
│   ├── User/                 # Citizen emergency SOS & ambulance radar
│   ├── Hospital/             # Hospital intake queue & fleet monitoring
│   └── Admin/                # Full system master data CRUD management
└── Layouts/
    └── LayoutMenuData.js     # Role-aware sidebar navigation hierarchy
```

### 2.1 Citizen Portal (`src/pages/User/`)
- **`EmergencySOS.js` (`/user/emergency`)**: 
  - One-click GPS Emergency SOS trigger.
  - Automatically captures browser Geolocation coordinates (`navigator.geolocation.getCurrentPosition`).
  - Dispatches immediate emergency requests directly to the triage engine.
- **`TrackAmbulance.js` (`/user/track`)**:
  - Live patient radar and tracking view using Google Maps API.
  - Displays patient marker, dispatched ambulance marker, and the active route polyline with live ETA and distance updates.
- **`MyCases.js` (`/user/cases`)**:
  - Personal case history showing past emergency requests and statuses (`Pending`, `Assigned`, `Completed`).

### 2.2 AI Medical Chatbot (`src/pages/MedicalChat/`)
- **`index.js` (`/medical-chat`)**:
  - Interactive multi-turn conversational intake.
  - Integrates Web Speech API (`webkitSpeechRecognition`) for hands-free voice input.
  - Streams voice audio back to the caller via Google Text-to-Speech (`gTTS`) or local synthesis.
  - Once sufficient clinical symptoms and discriminators are collected, it automatically invokes the dispatch pipeline and displays the assigned ambulance details.

### 2.3 Dispatch Dashboard (`src/pages/DashboardMedical/`)
- **`index.js` (`/dashboard`)**:
  - Central operational console.
  - Displays real-time KPIs: Active Emergency Count, Available Fleet, Average Response Time, Hospital Bed Capacities.
  - Embeds interactive Google Maps displaying all hospitals and roaming ambulances color-coded by readiness.
- **`RecentCases.js`**:
  - Real-time incident feed showing incoming cases and their triage priority.

### 2.4 Incident Case Management (`src/pages/Cases/index.js`)
- **`index.js` (`/cases` & `/admin/cases`)**:
  - Displays full records of all emergency incidents in the database.
  - Live keyword search by Case #, patient name, address, or symptoms.
  - Filter pills: `All`, `Emergency` (Red), `Clinical` (Orange/Yellow).
  - **View Details Modal**: Complete clinical summary, patient vitals, GPS coordinates with Google Maps external link.
  - **Admin Deletion**: Protected delete option with confirmation modal for administrative cleanup.

### 2.5 Hospital Operations Portal (`src/pages/Hospital/`)
- **`IncomingCases.js` (`/hospital/cases`)**:
  - Queue of ambulances en route to the hospital.
  - Allows ER reception to accept cases and update case statuses.
- **`FleetStatus.js` (`/hospital/fleet`)**:
  - Hospital-specific ambulance inventory, fuel level, equipment tier, and maintenance status.
- **`PatientTracking.js` (`/hospital/tracking`)**:
  - Hospital incoming patient tracking radar.

### 2.6 Admin Suite (`src/pages/Admin/`)
- **`Ambulances.js` (`/admin/ambulances`)**: Comprehensive ambulance CRUD (Add, edit vehicle number, tier, GPS coordinates, delete).
- **`Patients.js` (`/admin/patients`)**: Master patient records management with cascade deletion.
- **`Hospitals.js` (`/admin/hospitals`)**: Hospital network configuration, address, coordinates, and bed capacity.
- **`Users.js` (`/admin/users`)**: User account management and role assignments (`admin`, `hospital`, `user`).
- **`SystemPrompt.js` (`/admin/system-prompt`)**: Real-time management interface to customize and update the AI Clinical Prompt stored in MySQL.

---

## 3. LM Studio Local LLM Integration

The system runs completely on-premise without relying on external cloud LLM APIs (OpenAI/Anthropic). It communicates with **LM Studio** via OpenAI-compatible local endpoints.

```
┌─────────────────────────────────┐               HTTP POST (JSON)               ┌──────────────────────────────────────┐
│       FastAPI Backend           │ ───────────────────────────────────────────> │         LM Studio Local Server       │
│                                 │   URL: http://localhost:1234/v1/chat/        │   Port: 1234                         │
│  - prompts.py (MTS Prompts)     │        completions                           │   Model: google/gemma-4-12b-qat      │
│  - triage.py (Deterministic)    │ <─────────────────────────────────────────── │   (Local GPU/CPU Inference)          │
│  - medicalchat.py (Multi-turn)  │              Response Payload                └──────────────────────────────────────┘
└─────────────────────────────────┘
```

### 3.1 Local LLM Configuration (`backend/app/llm_config.py`)
Configuration is maintained via environment variables:
```python
LOCAL_LLM_URL = os.getenv("LOCAL_LLM_URL", "http://localhost:1234/v1/chat/completions")
LOCAL_LLM_MODEL = os.getenv("LOCAL_LLM_MODEL", "google/gemma-4-12b-qat")
LOCAL_LLM_REASONING = os.getenv("LOCAL_LLM_REASONING", "off").lower()

def llm_request_options() -> dict[str, Any]:
    """Optimizes inference latency by disabling unnecessary thinking tokens in LM Studio."""
    if reasoning_enabled():
        return {}
    return {
        "reasoning_effort": "none",
        "chat_template_kwargs": {"enable_thinking": False},
    }
```

### 3.2 Two-Stage Prompt Processing

#### Stage 1: Conversational Symptom Intake (`backend/app/prompts.py`)
- Employs conversational system prompts configured to avoid lengthy dialogues during emergencies.
- Constrains the AI to ask at most 1–2 rapid discriminator questions (e.g., *"Is the patient conscious? Are they breathing?"*) before extracting location and dispatch parameters.

#### Stage 2: Deterministic Clinical Triage Extraction (`backend/app/routers/triage.py`)
- Executes with **`temperature = 0.0`** to guarantee deterministic, reproducible outputs.
- Forces output into a strict JSON schema:
```python
prompt = f"""
You are an AI-powered medical dispatch assistant. Analyze the patient's symptoms and return a JSON object with the exact following structure.
Do not include any text before or after the JSON object.

{{
    "patient_triage": "Red" | "Orange" | "Yellow",
    "ambulance_type": "ICU" | "Advanced" | "Basic",
    "hospital_id": <id of most appropriate hospital or null>
}}

Patient Symptoms: {case.symptoms}
"""
```

### 3.3 Fail-Safe JSON Extraction
To guard against local models wrapping responses in markdown backticks or preface comments, `extract_json_from_llm_response` strips noise using regular expression boundaries:
```python
def extract_json_from_llm_response(text: str) -> str:
    match = re.search(r'\{.*\}', text, re.DOTALL)
    if match:
        return match.group(0)
    return text.strip()
```

---

## 4. Triage Routing Using the Manchester Triage System (MTS)

### 4.1 Manchester Triage System (MTS) Standard
The system enforces the clinical criteria of the **Manchester Triage System (MTS)**, mapping key discriminators directly to national ambulance equipment categories (**AIS-125** standards):

| MTS Category | Color Code | Max Response Window | Clinical Criteria & Discriminators | Required Ambulance Tier |
| :---: | :---: | :---: | :--- | :--- |
| **Immediate** | 🔴 **Red** | **0 min (Immediate)** | Cardiac arrest, respiratory arrest, severe trauma, massive hemorrhage, unresponsive. | **ICU Ambulance** (Ventilator, Defibrillator, Multipara Monitor) |
| **Very Urgent** | 🟠 **Orange** | **< 10 min** | Acute chest pain (suspected STEMI), stroke signs (FAST), severe difficulty breathing. | **Advanced (ALS)** (Cardiac monitor, IV drugs, Oxygen therapy) |
| **Urgent** | 🟡 **Yellow** | **< 60 min** | Stable open fractures, moderate trauma, severe abdominal pain without shock. | **Basic (BLS)** (Stretcher, Basic First Aid, Splints, O2) |
| **Standard** | 🟢 **Green** | > 120 min | Non-emergency walking cases, minor sprains, routine transfers. | **Hospital Non-emergency Transport** |

### 4.2 Intelligent Dispatch Allocation Algorithm
The dispatch engine in `backend/app/routers/triage.py` implements multi-factor geographic and severity dispatching:

```
                                [ Emergency Reported ]
                                          │
                                [ LLM MTS Analysis ]
                                          │
                   ┌──────────────────────┴──────────────────────┐
                   ▼                                             ▼
          🔴 Red / 🟠 Orange                            🟡 Yellow / 🟢 Green
         (Critical Emergency)                           (Low Severity / Stable)
                   │                                             │
      ┌────────────┴────────────┐                                ▼
      ▼                         ▼                      [ Hospital-Based Dispatch ]
[ City / Urban ]         [ Remote / Rural ]            Dispatched directly from
(e.g., Pallavaram)       (e.g., Vengal Amrita)         nearest primary hospital base.
      │                         │
      ▼                         ▼
Find nearest available   Prioritize reserved
roaming ICU/ALS unit     rural emergency units
via Haversine & GMaps    at remote sub-stations
```

1. **Distance Computation**:
   - The engine uses the **Haversine formula** for initial coordinate filtering across all active units:
   $$\text{distance} = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
   - Uses the **Google Maps Distance Matrix API** to calculate real-world driving distance and traffic duration.
2. **Context-Aware Dispatch Policy**:
   - **Low Urgency (Yellow / Green)**: Dispatches directly from hospital ambulance bays rather than depleting roaming street units.
   - **High Urgency in Urban Hubs (Red / Orange in Pallavaram / Chennai City)**: Dispatches the nearest available on-road roaming ICU/Advanced vehicle.
   - **High Urgency in Remote Regions (Red / Orange in Vengal / Tiruvallur)**: Dispatches dedicated reserved rural ambulances positioned at local village outposts rather than making patients wait for long city transits.
3. **Atomic Fleet State Update**:
   - The selected ambulance's state is atomically updated from `'available'` to `'dispatch'` in MySQL to prevent duplicate assignment.

---

## 5. Database Architecture & MySQL Workbench Verification Guide

### 5.1 SQLAlchemy ORM Connection (`backend/app/database.py`)
The backend connects to MySQL using PyMySQL driver via connection pooling:
```python
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:root@localhost:3306/medicalsystem",
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 5.2 Relational Entity Schema
The `medicalsystem` database consists of 7 normalized relational tables:

```
┌──────────────────┐           ┌──────────────────┐           ┌──────────────────┐
│    hospitals     │ 1       * │      users       │           │  system_prompts  │
├──────────────────┤───────────├──────────────────┤           ├──────────────────┤
│ id (PK)          │           │ id (PK)          │           │ id (PK)          │
│ name             │           │ email            │           │ prompt           │
│ address          │           │ password_hash    │           │ updated_at       │
│ latitude         │           │ role             │           └──────────────────┘
│ longitude        │           │ hospital_id (FK) │
│ available_beds   │           └──────────────────┘
└────────┬─────────┘                     │
         │ 1                             │ 1
         │                               │
         │ *                             │ *
┌────────┴─────────┐           ┌─────────┴────────┐           ┌──────────────────┐
│   ambulances     │ 1       * │      cases       │ *       1 │     patients     │
├──────────────────┤───────────├──────────────────┤───────────├──────────────────┤
│ ambulance_id(PK) │           │ id (PK)          │           │ id (PK)          │
│ hospital_id (FK) │           │ patient_id (FK)  │           │ name             │
│ type_of_amb      │           │ hospital_id (FK) │           │ age              │
│ vehicle_number   │           │ user_id (FK)     │           │ gender           │
│ current_location │           │ triage_level     │           │ contact          │
│ latitude         │           │ symptoms         │           │ patient_triage   │
│ longitude        │           │ location         │           │ ambulance_type   │
│ status           │           │ latitude         │           │ patient_status   │
│ fuel_level       │           │ longitude        │           └──────────────────┘
└────────┬─────────┘           │ status           │
         │ 1                   │ created_at       │
         │                     └──────────────────┘
         │ *
┌────────┴─────────┐
│     staffs       │
├──────────────────┤
│ staff_id (PK)    │
│ ambulance_id(FK) │
│ role             │
│ staff_status     │
└──────────────────┘
```

---

### 5.3 MySQL Workbench Verification Guide

To inspect and verify live operations directly in MySQL Workbench:

#### Step 1: Connect to the Database
1. Open **MySQL Workbench**.
2. Click on your local MySQL connection (Host: `127.0.0.1`, Port: `3306`, User: `root`).
3. Enter your MySQL password (`root`).

#### Step 2: Open SQL Editor
1. In the top toolbar, click the **New SQL Query Tab** icon (`Ctrl + T`).
2. Set the default schema to `medicalsystem`:
```sql
USE medicalsystem;
```

#### Step 3: Run Verification Queries

##### 1. Verify Recent Emergency Cases Logged
```sql
SELECT 
    c.id AS case_id,
    p.name AS patient_name,
    c.triage_level,
    p.ambulance_type AS required_tier,
    c.status AS case_status,
    c.location,
    c.latitude,
    c.longitude,
    c.created_at
FROM cases c
JOIN patients p ON c.patient_id = p.id
ORDER BY c.id DESC
LIMIT 10;
```
*Expected Result:* Displays the newest cases processed by the AI dispatch engine with their triage level (`Emergency`/`Clinical`), patient details, and GPS coordinates.

##### 2. Verify Ambulance Fleet Status & Readiness
```sql
SELECT 
    ambulance_id,
    vehicle_number,
    type_of_ambulance,
    current_location,
    status,
    fuel_level,
    last_updated
FROM ambulances
ORDER BY status ASC, type_of_ambulance DESC;
```
*Expected Result:* Shows all ambulances. Any vehicle currently on a mission will have `status = 'dispatch'`, while idle vehicles will display `'available'`.

##### 3. Reset Fleet to Available for Demo/Testing
```sql
SET SQL_SAFE_UPDATES = 0;
UPDATE ambulances SET status = 'available';
SET SQL_SAFE_UPDATES = 1;

-- Verify all are available
SELECT COUNT(*) AS total_ambulances, status FROM ambulances GROUP BY status;
```

##### 4. Verify Active Hospital Networks & Bed Counts
```sql
SELECT 
    h.id,
    h.name,
    h.address,
    h.available_beds,
    COUNT(a.ambulance_id) AS allocated_ambulances
FROM hospitals h
LEFT JOIN ambulances a ON h.id = a.hospital_id
GROUP BY h.id, h.name, h.address, h.available_beds;
```

##### 5. Check Active AI System Prompt
```sql
SELECT id, updated_at, LEFT(prompt, 200) AS prompt_snippet FROM system_prompts;
```
*Expected Result:* Shows the latest prompt stored in the database which the backend dynamically injects into LM Studio at runtime.

---

## 6. Summary Checklist for Demonstrations & Evaluations

| Feature | Verified Component | Working Proof |
| :--- | :--- | :--- |
| **Frontend Communication** | Axios & Fetch to `http://localhost:8000` | Network Tab shows `200 OK` on `/triage/all-recent` and `/llm-chat/` |
| **Local LLM** | LM Studio (`localhost:1234`) | Zero-cloud, local inference on `google/gemma-4-12b-qat` with 0.0 temp |
| **Triage Standard** | Manchester Triage System | Color-coded Red/Orange/Yellow categories linked to ICU/Advanced/Basic ambulances |
| **Intelligent Routing** | Severity & Region Based Routing | High emergency pulls roaming/reserved units; standard transfers pull from hospital bases |
| **Database Persistence** | MySQL Workbench (`medicalsystem`) | Relational integrity across `cases`, `patients`, `ambulances`, and `hospitals` |
