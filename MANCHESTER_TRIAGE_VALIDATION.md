# 🏥 Clinical Validation: Manchester Triage System (MTS) & AI Dispatch Alignment

> **Quick Summary:** This document proves how our AI Emergency Dispatch System verifies and validates its Local LLM against the **Manchester Triage System (MTS)** and statutory **National Ambulance Services (AIS-125)** standards.

---

## 1. The Standard: Manchester Triage System (MTS)

The **Manchester Triage System (MTS)** is an internationally recognized clinical risk-stratification protocol that prioritizes patients by clinical urgency rather than arrival time using **Clinical Discriminators** (Life threat, Pain, Hemorrhage, Conscious level, Acuteness of onset).

🔗 **Official Verification Links for Faculty Review:**
- **Clinical Validation Study (Open Access, 288,000+ Patients):** [PLOS ONE: Validity of the Manchester Triage System in Emergency Care](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0170811)
- **MTS Color & Protocol Reference:** [Wikipedia: Manchester Triage System Protocol](https://en.wikipedia.org/wiki/Triage#Hospital_systems)
- **AIS-125 National Ambulance Code (BLS / ALS Standards):** [Automotive Research Association of India (ARAI)](https://www.araiindia.com)
- **Ministry of Road Transport and Highways (Ambulance Norms):** [MoRTH Official Portal](https://morth.nic.in)

| MTS Category | Color | Max Response Time | Clinical Condition & Criteria | Pre-Hospital Ambulance Tier |
| :---: | :---: | :---: | :--- | :--- |
| **Immediate** | 🔴 **Red** | **0 min (Immediate)** | Active life threat: cardiac arrest, airway compromise, severe trauma. | **ICU / Advanced Life Support (ALS)** |
| **Very Urgent**| 🟠 **Orange** | **$<10$ min** | Imminent danger: acute chest pain (STEMI suspect), stroke symptoms. | **Advanced / Basic Life Support** |
| **Urgent** | 🟡 **Yellow** | **$<60$ min** | Serious but stable: open fractures, severe abdominal pain, high fever. | **Basic Life Support (BLS)** |
| **Standard / Non-urgent** | 🟢 **Green** / 🔵 **Blue** | $>120$ min | Minor walk-in conditions; handled as non-emergency clinical transport. | **Clinical / Outpatient Queue** |

---

## 2. How Our System Prompts Follow MTS

Our backend enforces MTS through a **two-phase pipeline**:

### Phase 1: Rapid Symptom Intake (`backend/app/prompts.py`)
- **MTS Rule:** In emergency calls, prolonged questioning increases mortality risk.
- **Implementation:** The prompt restricts conversational questions to a **maximum of 2 sentences** to identify the chief complaint and discriminators, then immediately transitions to collecting dispatch parameters (Name, Age, Gender, Phone, Location).

### Phase 2: Zero-Shot Clinical Classification (`backend/app/routers/triage.py`)
- **MTS Rule:** Classify patients strictly into standard clinical categories and match appropriate vehicle equipment.
- **Implementation:** The prompt executes at **`temperature = 0.0`** (deterministic) and constrains output to a strict JSON schema:
  - `patient_triage`: Strictly `'Red'`, `'Orange'`, or `'Yellow'`.
  - `ambulance_type`: Strictly `'ICU'`, `'Advanced'`, or `'Basic'`.
  - Enforced Clinical Coupling:
    - 🔴 **Red** $\rightarrow$ Requires **ICU** or **Advanced** unit.
    - 🟠 **Orange** $\rightarrow$ Requires **Advanced** or **Basic** unit.
    - 🟡 **Yellow** $\rightarrow$ Requires **Basic** unit.

---

## 3. Clinical Mapping Matrix

| Patient Symptoms Reported | Activated MTS Discriminator | Triage Level | Assigned Ambulance Tier |
| :--- | :--- | :---: | :---: |
| *"Unresponsive, collapsed, not breathing"* | **Life Threat** (Cardiopulmonary arrest) | 🔴 **Red** | **ICU** (Ventilator + Defibrillator) |
| *"Crushing chest pain radiating to left arm"* | **Specific Discriminator** (Cardiac / STEMI) | 🟠 **Orange** | **Advanced** (ECG + Cardiac Monitor) |
| *"Sudden facial droop, slurred speech"* | **Specific Discriminator** (Acute Neurological deficit) | 🟠 **Orange** | **Advanced** (Stroke emergency kit) |
| *"Compound leg fracture, heavy pain, alert"* | **General Discriminator** (High pain, stable hemodynamics) | 🟡 **Yellow** | **Basic** (Splinting + Oxygen) |

---

## 4. Verification & Validation (V&V) Guardrails

```
[ Patient Symptoms ] 
        │
        ▼
[ LLM (temp = 0.0) ] ──> Enforces strict JSON schema (Red / Orange / Yellow)
        │
        ▼
[ Regex Sanitizer ]  ──> Strips commentary; validates Age (1-120), Phone, Gender
        │
        ▼
[ Database Enums ]   ──> SQLAlchemy & Pydantic reject invalid/hallucinated tags
        │
        ▼
[ Safe Fallbacks ]   ──> On network/JSON error, defaults safely to Basic / Pending
        │
        ▼
[ Python Dispatch ]  ──> Deterministically dispatches via Google Maps ETA & Fuel >= 50%
```

1. **Deterministic Inference:** `temperature = 0.0` prevents random creative generation.
2. **Structural Sanitization:** Regex parsers clean inputs and validate numerical constraints.
3. **Database Schema Locking:** SQLAlchemy `Enum("Red","Orange","Yellow")` rejects invalid output.
4. **Algorithmic Isolation:** The LLM **never** selects vehicles or routes. Dispatch is calculated deterministically by Google Maps routing and vehicle fuel thresholds ($\ge 50\%$).
5. **Fail-Safe Fallback:** Any network or parsing failure defaults safely to a baseline priority with alerts to human dispatchers.

---

### References & Proof Links
- **Primary Clinical Study:** *Validity of the Manchester Triage System in Emergency Care: A Prospective Observational Study* — [PLOS ONE (DOI: 10.1371/journal.pone.0170811)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0170811)
- **Standard Protocol Reference:** *Hospital Systems and Triage Protocols* — [Wikipedia Reference](https://en.wikipedia.org/wiki/Triage#Hospital_systems)
- **Statutory Vehicle Standard:** *AIS-125: National Ambulance Code (Requirements for BLS / ALS Vehicles)* — [ARAI Portal](https://www.araiindia.com) & [MoRTH](https://morth.nic.in)
