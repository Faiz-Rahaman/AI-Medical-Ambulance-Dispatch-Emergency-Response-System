# 🚑 AI Medical Ambulance Dispatch & Emergency Response System

<div align="center">

[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![Redux](https://img.shields.io/badge/Redux-Toolkit-764ABC?style=for-the-badge&logo=redux&logoColor=white)](https://redux.js.org/)
[![Google Maps](https://img.shields.io/badge/Google%20Maps-API%20Platform-4285F4?style=for-the-badge&logo=googlemaps&logoColor=white)](https://developers.google.com/maps)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

<p align="center">
  <strong>An autonomous, real-time emergency triage, proximity dispatch, and fleet management ecosystem powered by Large Language Models, Real-Time Audio Streaming, and Google Maps Navigation Engine.</strong>
</p>

[Key Features](#-key-features) •
[Team & Academic Details](#-team--academic-details) •
[System Architecture](#-system-architecture) •
[Role-Based Portals](#-role-based-portals) •
[Proximity Dispatch Engine](#-proximity-based-dispatch-engine) •
[Amrita Hospital Network](#-tiruvallur--amrita-college-hospital-network) •
[Remote Area Strategy](#-remote--rural-emergency-contingency-strategy) •
[Project Deliverables](#-project-deliverables--documentation) •
[Installation & Setup](#-getting-started)

<br/>

![Live Satellite Tracking Interface](Documentation/media_1790946161669.png)

</div>

---

## 👨‍💻 Team & Academic Details

- **Course**: Full Stack Development [P.E.4]
- **Degree**: Bachelor of Technology in Computer Science & Engineering (AI)
- **Institution**: Amrita School of Computing, Amrita Vishwa Vidyapeetham, Chennai Campus
- **Academic Year**: 2025–2026 | Semester VII
- **Repository**: [https://github.com/Faiz-Rahaman/AI-Medical-Ambulance-Dispatch-Emergency-Response-System](https://github.com/Faiz-Rahaman/AI-Medical-Ambulance-Dispatch-Emergency-Response-System)

| Student Name | Register Number | Role / Key Contributions |
| :--- | :--- | :--- |
| **FAIZ RAHAMAN** | `CH.SC.U4AIE23014` | Proximity Dispatch Algorithm, Google Maps Integration, Autonomous Triage Engine |
| **HARINDERAN T** | `CH.SC.U4AIE23019` | FastAPI Backend Architecture, Role-Based Authentication, SQLAlchemy Database Models |
| **K KOUSHIK** | `CH.SC.U4AIE23024` | React.js Frontend Dashboards, Emergency SOS Portal, Live Satellite Tracking UI |

---

## 📌 Executive Overview

In medical emergencies, the **"Golden Hour"** dictates that emergency intervention within the first 60 minutes dramatically improves patient survival. Every minute of delay raises trauma and cardiac mortality by 7–10%. Traditional 911/108 call-handling workflows suffer from critical operational bottlenecks:
- **Manual Intake Latency**: Operators spend 3 to 7 minutes transcribing details over frantic phone calls.
- **Geographic Misallocation**: Lack of spatial validation causes units to be dispatched from distant hubs (or across state borders) while closer local ambulances remain idle.
- **Hospital ER Blindness**: Ambulances frequently arrive at emergency rooms only to discover 100% bed occupancy.
- **Zero Caller Telemetry**: Panicked families receive no live route tracking, driver contact, or intermediate first-aid advice.

The **AI Medical Ambulance Dispatch & Emergency Response System** resolves these challenges by automating the entire lifecycle:
1. **Multimodal Emergency Intake**: Voice-enabled conversational AI triage with real-time gTTS audio streaming and 1-click Web SOS with browser GPS geocoding.
2. **Clinical Severity Triage (LLM)**: Analyzes unstructured symptom descriptions to classify cases (`Red` / `Orange` / `Yellow`) and matches required life support tiers (`ICU` / `Advanced` / `Basic`).
3. **Three-Tier Severity-Aware Dispatching**: Filters ambulances by clinical severity (Emergency / Clinical / Transport) and geographic context (city vs remote), queries Google Maps Routes API for live road traffic and ETAs, and verifies ambulance readiness (>50% fuel).
4. **Role-Protected Web Portals**: Dedicated, tailored dashboards for Citizens, Hospital Staff, and System Administrators.

---

## ✨ Key Features

### 🧠 1. Intelligent AI Clinical Triage & Emergency-First Protocol
- **Strict 4-Step Emergency Protocol**: Prevents premature dispatch by strictly validating caller intent:
  1. **Emergency & Symptom Check**: If the caller only says *"Hi"*, *"Help"*, or gives contact details, the AI actively inquires: *"What is your medical emergency and what symptoms are you experiencing?"*
  2. **Immediate Life-Saving First-Aid**: Delivers clinical advice tailored to symptoms (e.g., chest pain sitting posture, burn cooling, bleeding pressure) before asking for paperwork.
  3. **Patient Demographics**: Efficiently collects patient Name, Age (numeric), Gender (inferred or requested), and Contact Phone.
  4. **Structured Dispatch Payload**: Generates dispatch JSON containing both patient demographics and AI-extracted clinical symptoms.
- **Zero-Shot Clinical Parameter Extraction**: Extracts structured triage metadata (`case_triage`, `patient_triage`, `ambulance_type`, `identified_symptoms`).
- **Standardized Medical Protocol**:
  - 🔴 **Red Priority (Emergency)**: Critical/life-threatening (cardiac arrest, respiratory failure, severe trauma) $\rightarrow$ Dispatches **ICU** or **Advanced Life Support (ALS)** units.
  - 🟠 **Orange Priority (Urgent)**: Severe but non-immediate conditions $\rightarrow$ Dispatches **Advanced** or **Basic** units.
  - 🟡 **Yellow Priority (Transport)**: Stable conditions $\rightarrow$ Dispatches **Basic Life Support (BLS)** units.
- **Runtime Prompt Tuning**: Administrators can fine-tune LLM clinical intake behavior directly via the Admin UI, syncing instantly with MySQL without server restarts.

### 🚑 2. Three-Tier Severity-Aware Dispatch Engine
- **Context-Aware Triage Routing**: Adapts ambulance source selection based on clinical severity (`Emergency` / `Clinical` / `Transport`) and geographic density (city vs remote).
  - **Tier 1 (Non-Emergency)**: Dispatches only hospital-attached transport ambulances, preserving emergency fleet capacity.
  - **Tier 2 (Emergency + City)**: Dispatches nearest available unit regardless of source for maximum speed in high-density urban areas.
  - **Tier 3 (Emergency + Remote)**: Prioritizes reserved standalone/highway patrol ambulances pre-positioned for rural coverage.
- **Hospital Density Heuristic**: Classifies patient location as "City" (≥3 hospitals within 15 km) or "Remote" (<3 hospitals) using Haversine radius counting.
- **Cross-Jurisdictional Routing Fix**: Guarantees strictly localized hospital and vehicle assignment, eliminating cross-state routing errors.
- **Fuel Reserve Validation**: Ambulances below $50\%$ fuel are disqualified from dispatch to guarantee zero en-route breakdowns.
- **Traffic-Aware Navigation**: Evaluates actual driving duration and distance via **Google Maps Routes API** with automatic Directions API and Haversine fallback.

### 🎙️ 3. Hands-Free Voice-Enabled Emergency Chatbot (gTTS Audio Streaming)
- **Interactive Audio Guidance**: Real-time synthetic speech audio streaming for all clinical triage instructions and first-aid steps.
- **Multimodal Conversational Intake**: Patients and bystanders can communicate naturally via interactive conversational chat with instant voice playback.
- **Dynamic Status Updates**: Inquirers can check vehicle dispatch status and receive real-time driving distance and ETA updates.
- **Automated First-Aid Instructions**: Reassures the caller with clinical guidance (e.g., CPR coaching, bleeding pressure, sitting upright).

### 🗺️ 4. Interactive Animated Ambulance Tracking & Live Telemetry
- **Animated Vector Polyline Movement**: The ambulance marker dynamically moves along the actual road route calculated by Google Maps from the assigned hospital to the patient's coordinates.
- **Live Telemetry HUD**: Overlays real-time progress percentage, current vehicle speed (km/h), dynamic ETA countdown, and a pulsing `● LIVE` badge.
- **Interactive Tracking Controls**: User and operator can **Play**, **Pause**, or **Reset** the route animation at any time.
- **Synchronized ER Progress Bar**: Hospital ER portal updates live travel percentage dynamically, eliminating static hardcoded estimates.

### 📍 5. Accurate Location Pinpoint & Robust UI Bounds
- **GPS-First Pinpointing**: Replaced volatile browser IP geolocation with high-precision GPS coordinate capture and interactive map pinning.
- **Persistent Location Memory**: Pinned emergency coordinates are automatically stored in local browser state, preventing loss upon page reload.
- **UI Boundary Protection**: Clean CSS truncation and tooltip wrapping ensure long addresses and patient notes never overflow card containers.

---

## 🏗️ System Architecture

```mermaid
flowchart TB
    subgraph INTAKE[" 1. Emergency Intake Layer "]
        P1["💻 Web SOS / Medical Chat User\n(Browser / Mobile GPS)"] -->|"Interactive Chat & SOS Intake"| FE["React Command Center\n(Velzon UI / Redux)"]
    end

    subgraph BACKEND[" 2. FastAPI Core Application Layer "]
        API["FastAPI Dispatch Gateway\n(Entry Point)"]
        
        subgraph ROUTERS[" Router Modules "]
            R_TRIAGE["/triage\n(Clinical Case Management)"]
            R_CHAT["/llm-chat\n(Conversational Symptom Intake)"]
            R_MAPS["/maps\n(Routing & Fleet Allocation)"]
            R_USER["/user\n(Citizen SOS & Tracking)"]
            R_HOSP["/hospital\n(Bed & Fleet Management)"]
            R_ADMIN["/admin\n(Fleet CRUD & Prompt Engineering)"]
        end

        subgraph SERVICES[" 3. Intelligence & Computational Engines "]
            LLM_ENG["LLM Engine\n(Gemma 4-12B / LM Studio / OpenAI)"]
            GEO_ENG["Google Maps Engine\n(Directions, Traffic & Geocoding)"]
            SORT_ALG["Proximity Selection Algorithm\n(Haversine + Multi-Criteria Ranking)"]
            TTS_ENG["gTTS Audio Streaming Engine"]
            BG_TASK["Async Lifecycle Daemon\n(Case Auto-Completion)"]
        end
    end

    subgraph PERSISTENCE[" 4. Persistence Layer (MySQL) "]
        DB[(MySQL Database)]
        T_USERS["users (Auth & Roles)"]
        T_PATIENTS["patients (Master Records)"]
        T_CASES["cases (Incidents & Status)"]
        T_AMBULANCES["ambulances (Fleet & GPS)"]
        T_HOSPITALS["hospitals (Beds & Location)"]
        T_STAFF["staffs (Medical Personnel)"]
        T_PROMPTS["system_prompts (LLM Templates)"]
    end

    %% Flow Connections
    FE -->|"REST API / WebSockets"| API

    API --> R_TRIAGE
    API --> R_CHAT
    API --> R_MAPS
    API --> R_USER
    API --> R_HOSP
    API --> R_ADMIN

    R_CHAT --> LLM_ENG
    R_CHAT --> TTS_ENG
    R_TRIAGE --> LLM_ENG
    R_TRIAGE --> R_MAPS
    R_MAPS --> GEO_ENG
    R_MAPS --> SORT_ALG
    R_USER --> R_MAPS

    R_TRIAGE --> DB
    R_MAPS --> DB
    R_USER --> DB
    R_HOSP --> DB
    R_ADMIN --> DB
    BG_TASK --> DB

    DB --- T_USERS
    DB --- T_PATIENTS
    DB --- T_CASES
    DB --- T_AMBULANCES
    DB --- T_HOSPITALS
    DB --- T_STAFF
    DB --- T_PROMPTS
```

---

## 🖥️ Role-Based Portals & Data Isolation

The application implements granular role-based authorization and strict multi-tenant data isolation ensuring secure, customized interfaces:

### 1. 👤 Citizen / Patient Portal (`/user/*`)
- **Emergency SOS Page (`/user/emergency`)**: Single-click SOS trigger with instant GPS capture. Includes quick location presets for high-risk zones (e.g., *Pallavaram*, *Vengal College / Tiruvallur*, *Tambaram*, *Chennai Central*).
- **Live Tracking Interface (`/user/track`)**: Real-time satellite route map showing dispatched vehicle, driver contact button, siren indicator, and step-by-step first-aid guidance.
- **My Incident History (`/user/my-cases`)**: Private, isolated audit trail displaying **only emergencies submitted by the logged-in citizen**. New user accounts start with 0 cases rather than seeing other citizens' medical incidents.
- **Personalized Dashboard Telemetry**: Live widgets (`/dashboard`) automatically filter counters (`Total Cases`, `Pending`, `In Progress`, `Completed`) to reflect the specific user's emergency requests.

### 2. 🏥 Hospital ER Management Portal (`/hospital/*`)
- **Hospital-Scoped Incident Feed (`/hospital/cases`)**: Displays en-route ambulances and incoming cases strictly assigned to the logged-in hospital's ER department or unassigned regional incidents.
- **Live Bed Occupancy Dashboard**: Real-time counter for ICU and General Emergency beds with dynamic increment/decrement controls.
- **Incoming Case Triage Feed**: Displays en-route ambulances, patient symptom breakdown, and assigned ETA so trauma teams can prep operating bays prior to vehicle arrival.
- **Hospital Fleet Overview (`/hospital/fleet`)**: Tracks ambulances stationed at the medical center.

### 3. 🛡️ System Administration Command Center (`/admin/*`)
- **Global Dispatch Telemetry**: System administrators oversee system-wide totals across all medical centers, seeing the aggregate count of all dispatched cases across the entire network.
- **Fleet Inventory & Status Manager**: Full CRUD operations for ambulances, vehicle categories (ICU/Advanced/Basic), fuel monitoring, and maintenance logs.
- **Hospital Directory**: Manages partner hospitals, geographic coordinates, and contact details.
- **System Prompt Tuning**: Live interface allowing clinical administrators to tweak LLM prompts and triage thresholds on the fly.
- **User Role Management**: Assigns and verifies permissions for Admins, Hospital Staff, and Citizens.

---

## 🧮 Proximity-Based Dispatch Engine

Traditional radius searches often pick ambulances that are geographically close on paper but separated by rivers, railway tracks, or state borders. Our proximity engine uses a **three-tier severity-aware strategy** that adapts dispatch behavior based on clinical triage level and geographic context:

### Severity-Aware Dispatch Tiers

| Tier | Trigger Condition | Selection Logic | Rationale |
|:---|:---|:---|:---|
| **Tier 1** (Non-Emergency) | `Clinical` or `Transport` triage | Only ambulances attached to a hospital (`hospital_id IS NOT NULL`) | Preserves standalone emergency units for critical cases; uses scheduled hospital transport fleet |
| **Tier 2** (Emergency + City) | `Emergency` triage + ≥3 hospitals within 15 km | **Nearest** available ambulance regardless of source | Speed is paramount in urban areas with dense infrastructure |
| **Tier 3** (Emergency + Remote) | `Emergency` triage + <3 hospitals within 15 km | **Reserved/standalone** ambulances first (`hospital_id IS NULL`) | Highway patrol and rural outpost units are pre-positioned for remote coverage |

### How "Remote" vs "City" is Determined

The system uses a **hospital density heuristic**: it counts how many hospitals exist within a 15 km Haversine radius of the patient's GPS coordinates.
- **≥3 hospitals** → classified as **City** (high-density urban area)
- **<3 hospitals** → classified as **Remote** (low-density rural area)

### Dispatch Pipeline

```
[ Inbound Emergency with GPS Coordinates + Clinical Severity ]
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Step 1: Fleet Eligibility Filter                            │
 │ • status == 'available'                                     │
 │ • fuel_level > 50%                                          │
 │ • Valid GPS coordinates present                             │
 │ • Ambulance type matches clinical need (ICU/Advanced/Basic) │
 └─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Step 2: Severity-Aware Source Filtering                     │
 │ • Clinical/Transport → hospital ambulances only (Tier 1)   │
 │ • Emergency + City   → all ambulances (Tier 2)             │
 │ • Emergency + Remote → standalone/reserved first (Tier 3)  │
 └─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Step 3: Google Maps Routes API / Directions API             │
 │ • Real-time driving duration (seconds) + distance (meters)  │
 │ • Encoded polyline for animated frontend route tracking     │
 │ • Automatic Haversine fallback on API failure               │
 └─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Step 4: Multi-Criteria Lexicographic Sort                   │
 │   sort_key = (duration_seconds, distance_meters, -fuel)     │
 └─────────────────────────────────────────────────────────────┘
                               │
                               ▼
 ┌─────────────────────────────────────────────────────────────┐
 │ Dispatch Execution:                                         │
 │ • Ambulance status → 'dispatch'                             │
 │ • Case status → 'Assigned'                                  │
 │ • Returns dispatch_tier label + full route polyline          │
 └─────────────────────────────────────────────────────────────┘
```

### Dispatch Test Verification (`backend/test_dispatch.py`)
Run the test script to verify severity-aware dispatch across all three tiers:
```bash
python backend/test_dispatch.py
```
- **Test 1 — Location Classification**: Pallavaram (5 hospitals within 15km → CITY), Vengal (2 hospitals → REMOTE)
- **Test 2 — Non-Emergency City (knee injury)**: Tier-1 dispatches a **hospital-attached** ambulance
- **Test 3 — Non-Emergency Remote**: Tier-1 dispatches from the nearest **hospital fleet**
- **Test 4 — Emergency City (heart attack)**: Tier-2 dispatches the **nearest available** unit (e.g., MIOT International, 23 min)
- **Test 5 — Emergency Remote (accident near Amrita College)**: Tier-3 dispatches a **reserved standby** unit (e.g., Vengal PHC ambulance, 1 min)



---

## 🏥 Tiruvallur & Amrita College Hospital Network

To demonstrate realistic proximity dispatching during project reviews at **Amrita Vishwa Vidyapeetham (Chennai Campus, Vengal, Tiruvallur - `13.2340° N, 80.0120° E`)**, the database is populated with **10 real, geographically accurate medical institutions** across the Tiruvallur and North Chennai corridor, paired with **12 fully equipped ambulances**:

| Hospital Name | Location & Distance from Amrita | Facility Tier | Emergency Beds | Stationed Fleet |
| :--- | :--- | :--- | :---: | :---: |
| **Vengal Primary Health Centre (PHC)** | Vengal Village (~4.2 km) | Primary Care / First Responder | 4 Beds | 1 Basic (BLS) |
| **Periyapalayam Community Health Centre (CHC)** | Periyapalayam High Road (~8.5 km) | Community Health Centre | 8 Beds | 1 Advanced (ALS) |
| **Tiruvallur Govt. Headquarters Hospital** | JN Road, Tiruvallur (~16.2 km) | District Headquarters (GH) | 35 Beds | 1 ICU + 1 ALS |
| **R.K. Hospital Tiruvallur** | C.V. Naidu Salai, Tiruvallur (~15.8 km) | Multi-Speciality Private | 12 Beds | 1 Advanced (ALS) |
| **DRJ Hospital Tiruvallur** | Raja Street, Tiruvallur (~16.5 km) | Surgical & Trauma Care | 10 Beds | 1 Basic (BLS) |
| **Sri Venkateswara Hospital & Clinic** | Tamaraipakkam Junction (~7.1 km) | Urgent Care & Stabilization | 6 Beds | 1 Basic (BLS) |
| **Redhills Government Hospital** | GNT Road, Redhills (~18.4 km) | Sub-District Government Center | 16 Beds | 1 Advanced (ALS) |
| **Apollo Speciality Hospitals Vanagaram** | Vanagaram-Ambattur Road (~29.0 km) | Super-Speciality Tertiary Care | 28 Beds | 1 ICU + 1 ALS |
| **Billroth Hospitals Shenoy Nagar** | Shenoy Nagar, Chennai (~34.0 km) | Super-Speciality Cardiac/Trauma | 22 Beds | 1 ICU + 1 ALS |
| **Rajiv Gandhi Govt. General Hospital (RGGGH)** | Park Town, Central Chennai (~38.0 km) | Apex State Trauma Center | 50 Beds | 1 ICU |

### Fleet Readiness Standards:
- **Vehicle Fuel Levels**: Seeded between **$86\%$ and $98\%$**, exceeding the system's $50\%$ minimum dispatch threshold.
- **Privacy Compliance**: All emergency contact numbers are mapped to standard sanitized demo formats (`+91 94440 XXXXX` / `+91 44 2766 XXXX`), avoiding any real civilian phone exposure while looking professional for presentation.
- **Seeding Command**:
  ```bash
  python backend/seed_vengal_network.py
  ```

---

## 🏔️ Remote & Rural Emergency Contingency Strategy

A common viva/review question is: **"How does your system tackle emergencies occurring in remote, rural, or low-connectivity locations (e.g. Vengal Village, farmlands, outer highways)?"**

Our architecture incorporates a 5-pillar contingency strategy specifically designed for remote and rural operations:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │       Remote / Rural Emergency Detected                 │
                  │   (e.g., Amrita Campus, Vengal Village Farmlands)       │
                  └────────────────────────────┬────────────────────────────┘
                                               │
               ┌───────────────────────────────┼───────────────────────────────┐
               ▼                               ▼                               ▼
 ┌───────────────────────────┐   ┌───────────────────────────┐   ┌───────────────────────────┐
 │ 1. Tiered PHC First-      │   │ 2. Landmark & GPS         │   │ 3. Pre-Cached Offline     │
 │    Responder Stabilization│   │    Coordinate Pinpoint    │   │    Vector Road Polylines  │
 │ • Dispatches Vengal PHC   │   │ • Bypasses missing street │   │ • Pre-fetches entire route│
 │   unit (4 km, ~6 min) for │   │   names using precise     │   │   on initial dispatch so  │
 │   immediate airway/CPR/   │   │   lat/long GPS pins and   │   │   intermittent 4G cellular│
 │   hemorrhage control.     │   │   notable local landmarks.│   │   never drops navigation. │
 └─────────────┬─────────────┘   └─────────────┬─────────────┘   └─────────────┬─────────────┘
               │                               │                               │
               └───────────────────────────────┼───────────────────────────────┘
                                               │
                                               ▼
               ┌───────────────────────────────────────────────────────────────┐
               │ 4. Telemetry-Linked Tertiary Escalation Handoff               │
               │ • If condition is Red/Critical, local unit stabilizes en-route│
               │   while tertiary center (Tiruvallur GH / Apollo) preps trauma │
               │   bay and ICU team using live incoming patient telemetry.     │
               └───────────────────────────────────────────────────────────────┘
                                               │
                                               ▼
               ┌───────────────────────────────────────────────────────────────┐
               │ 5. Standby Reserve Queue Protection                           │
               │ • If all immediate rural units are engaged, request enters   │
               │   highest priority queue and regional standby unit is alerted │
               │   with instant synthetic voice notification to caller.        │
               └───────────────────────────────────────────────────────────────┘
```

1. **Tiered Medical Hierarchy (PHC First-Responder Model)**:
   - Rather than forcing rural patients to wait 35–45 minutes for an urban super-speciality ambulance from central Chennai, the system dispatches the closest **Primary Health Centre (Vengal PHC ~4.2 km)** or **Community Health Centre (Periyapalayam CHC ~8.5 km)**. Paramedics perform immediate stabilization (oxygenation, AED, bleeding control) within the critical Golden Hour.
2. **Telemetry-Linked Tertiary Escalation**:
   - For high-acuity `Red` triage cases (severe polytrauma, acute myocardial infarction), the primary unit stabilizes the patient while coordinating a rendezvous or transfer to **Tiruvallur GH** or **Apollo Vanagaram**, with live ER dashboard syncing.
3. **Exact GPS Pinpointing Over Street Addresses**:
   - Rural areas frequently lack standard street names and door numbers. The system captures exact **WGS84 GPS coordinates (`13.2340, 80.0120`)** with interactive pin relocation and persistent local storage, bypassing geocoding ambiguities.
4. **Resilient Offline Route & Polyline Caching**:
   - When mobile data connectivity is patchy along rural highways, the Google Maps polyline geometry and turn-by-turn maneuvers are pre-cached on the client device upon dispatch confirmation, ensuring continuous tracking even through network dead zones.
5. **Standby Reserve Queue Fallback**:
   - In low-density rural regions where vehicle supply is limited, if all primary units are committed, the backend dynamically marks the incident as `Pending High-Priority Reserve` and notifies the caller while alerting regional standby fleet reserves.

---

## 📦 Project Deliverables & Documentation

All deliverables required for academic and technical evaluation are maintained in the repository:

| File Path | Deliverable Description | Format |
| :--- | :--- | :--- |
| [`Documentation/AI_Ambulance_Dispatch_System_Report.docx`](Documentation/AI_Ambulance_Dispatch_System_Report.docx) | Formal Word Project Report formatted to academic standards (Title page, Bonafide Certificate, Declaration, Methodology, Results, Bibliography). | `.docx` |
| [`Documentation/AI_Medical_Ambulance_Dispatch_FullStack_Team15.pptx`](Documentation/AI_Medical_Ambulance_Dispatch_FullStack_Team15.pptx) | Complete 12-Slide Final Review Presentation utilizing the official Amrita template, featuring interactive yellow/white sidebar navigation. | `.pptx` |
| [`Documentation/arch_1.png`](Documentation/arch_1.png) | High-Resolution Layered Architecture Diagram. | `.png` |
| [`Documentation/arch_2.png`](Documentation/arch_2.png) | End-to-End System Workflow Blueprint with full technology labeling. | `.png` |
| [`Documentation/AI_Ambulance_Dispatch_Gantt_Chart.xlsx`](Documentation/AI_Ambulance_Dispatch_Gantt_Chart.xlsx) | Project execution timeline and milestone Gantt chart. | `.xlsx` |
| [`SETUP_GUIDE.md`](SETUP_GUIDE.md) | Comprehensive step-by-step local setup guide for MySQL, Python backend, and React frontend. | `.md` |

---

## 🛠️ Full Stack Technologies Used

| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React.js | `18.3.1` | Single Page Application framework |
| **UI Framework** | Velzon & Bootstrap | `5.3` | Responsive medical dashboard components |
| **State Management** | Redux Toolkit | `2.x` | Global case telemetry and authentication state |
| **Backend API** | FastAPI | `0.104.1` | High-performance asynchronous REST endpoints |
| **ASGI Server** | Uvicorn | `0.24.0` | Production ASGI web server |
| **Database** | MySQL Server | `8.0+` | Relational persistence for emergency records |
| **ORM** | SQLAlchemy | `2.0+` | Database abstraction and migrations |
| **Voice Audio Engine** | gTTS | Google TTS Engine | Real-time synthetic voice guidance & triage audio |
| **Local LLM** | Google Gemma-4-12B | LM Studio / Ollama | Zero-shot symptom triage and severity scoring |
| **Mapping Engine** | Google Maps Platform | REST APIs | Road navigation, live traffic ETAs & Geocoding |

---

## 🚀 Getting Started

### 📋 Prerequisites
- **Python**: 3.10, 3.11, or 3.12 (with PATH enabled)
- **Node.js**: v18 or v20 LTS
- **MySQL Server**: 8.0+ or XAMPP (running on port `3306`)
- **Git**: Latest version

---

### 🗄️ 1. Database Setup (MySQL)
Open MySQL terminal or phpMyAdmin and execute:
```sql
CREATE DATABASE IF NOT EXISTS medicalsystem;
```

---

### 🐍 2. Backend Setup & Launch
1. Open terminal and navigate to `backend/`:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   # Windows PowerShell
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # Linux / macOS
   python3 -m venv venv
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables (`backend/.env`):
   ```env
   DATABASE_URL=mysql+pymysql://root:password@localhost:3306/medicalsystem
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   LOCAL_LLM_URL=http://localhost:1234/v1/chat/completions
   LOCAL_LLM_MODEL=google/gemma-4-12b-qat
   ```
5. Seed demo data (Amrita / Tiruvallur network & system prompt):
   ```bash
   # Seed 10 real hospitals & 12 ambulances near Amrita Vishwa Vidyapeetham, Vengal
   python seed_vengal_network.py

   # Sync the emergency-first clinical triage system prompt to MySQL database
   python update_db_prompt.py
   ```
   *(Optional: Run `python clear_hospitals.py` if you wish to reset back to the standard Chennai metropolitan fleet).*
6. Start the FastAPI server:
   ```bash
   python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
- **Interactive Swagger Documentation**: `http://localhost:8000/docs`
- **ReDoc Documentation**: `http://localhost:8000/redoc`

---

### ⚛️ 3. Frontend Setup & Launch
1. Open a new terminal and navigate to `frontend/default/`:
   ```bash
   cd frontend/default
   ```
2. Install dependencies:
   ```bash
   npm install --legacy-peer-deps
   ```
3. Launch the development server:
   ```bash
   npm start
   ```
- **Web Application**: `http://localhost:3000`

---

## 🔒 Privacy & Sanitization Notice

- **No Real Phone Numbers**: All database records and seeder files utilize sanitized dummy phone numbers (e.g., `+91 44 2000 000X`).
- **Secret Isolation**: Production API keys and database credentials are strictly maintained in `.env` and excluded from source control via `.gitignore`.
- **Emergency Helplines**: UI references standard emergency dialing lines (108 / 112) for academic demonstration.

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

<div align="center">
  <sub>Built with ❤️ by Team 15 for the Full Stack Development Capstone Project.</sub>
</div>
