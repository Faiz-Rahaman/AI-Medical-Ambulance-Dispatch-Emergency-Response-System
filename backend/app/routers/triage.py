# backend/app/routers/triage.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import httpx
import os
import json
from typing import List, Optional

# Assuming your schemas are in the schemas.py file
from ..schemas import CaseInput, CaseResponse, RecentCaseResponse, AmbulanceStatusResponse
from .. import crud, models
from ..database import get_db
from ..llm_config import (
    LOCAL_LLM_MODEL,
    LOCAL_LLM_URL,
    extract_llm_message_content,
    llm_request_options,
)


router = APIRouter(prefix="/triage", tags=["Triage"])

API_URL = LOCAL_LLM_URL

def generate_unique_vehicle_number(db: Session) -> str:
    """Generate a unique vehicle number for ambulances."""
    import random
    import string
    
    while True:
        # Generate a random vehicle number in format: TN-XX-YY-XXXX
        state_code = "TN"  # Tamil Nadu
        district_code = f"{random.randint(10, 99):02d}"
        series_code = ''.join(random.choices(string.ascii_uppercase, k=2))
        vehicle_number = f"{random.randint(1000, 9999):04d}"
        
        full_number = f"{state_code}-{district_code}-{series_code}-{vehicle_number}"
        
        # Check if this number already exists
        existing = db.query(models.Ambulance).filter(models.Ambulance.vehicle_number == full_number).first()
        if not existing:
            return full_number


@router.post("/", response_model=CaseResponse)
async def create_new_case(case: CaseInput, db: Session = Depends(get_db)):
    # --- Step 1: Simplified prompt - no ambulance generation ---
    prompt = f"""
    You are an AI-powered medical dispatch assistant. Analyze the patient's symptoms and return a JSON object with the exact following structure.
    Do not include any text before or after the JSON object.

    JSON Structure:
    {{
      "case_triage": "one of: 'Emergency', 'Transport', or 'Clinical'",
      "patient_triage": "one of: 'Red', 'Orange', or 'Yellow'",
      "ambulance_type": "one of: 'Basic', 'Advanced', or 'ICU'",
      "initial_patient_status": "Set to 'Pending' by default",
      "identified_symptoms": "A comma-separated list of key symptoms identified from the text."
    }}

    - 'Red' patient_triage requires an 'ICU' or 'Advanced' ambulance.
    - 'Orange' requires an 'Advanced' or 'Basic' ambulance.
    - 'Yellow' requires a 'Basic' ambulance.

    Patient Symptoms: {case.symptoms}
    """

    payload = {
        "model": LOCAL_LLM_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a professional medical dispatch assistant. Your responses must be in the specified JSON format only."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        "temperature": 0.0,
        "max_tokens": 400,
        **llm_request_options(),
    }

    headers = {"Content-Type": "application/json"}

    ai_data = {}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(API_URL, json=payload, headers=headers, timeout=30.0)
            response.raise_for_status()
            response_data = response.json()
            if response_data.get("choices"):
                ai_response_text = extract_llm_message_content(response_data)
                ai_data = json.loads(ai_response_text)
    except httpx.RequestError as e:
        print(f"Error calling LM Studio API: {e}")
    except json.JSONDecodeError as e:
        print(f"Error parsing AI response: {e}")

    # --- Step 2: Extract AI analysis data ---
    case_triage = ai_data.get("case_triage", "Clinical")
    patient_triage = ai_data.get("patient_triage", "Yellow")
    ambulance_type = ai_data.get("ambulance_type", "Basic")
    initial_patient_status = ai_data.get("initial_patient_status", "Pending")
    identified_symptoms = ai_data.get("identified_symptoms", case.symptoms)

    gender_code = 'M' if case.gender.lower() == 'male' else 'F'

    # --- Step 3: Create patient and case first ---
    db_patient = models.Patient(
        name=case.name,
        age=case.age,
        gender=gender_code,
        contact=case.contact,
        patient_triage=patient_triage,
        ambulance_type=ambulance_type,
        patient_status=initial_patient_status
    )
    
    # Convert float to Decimal for database storage
    from decimal import Decimal
    latitude = case.latitude
    longitude = case.longitude
    
    if latitude is not None:
        latitude = Decimal(str(latitude))
    if longitude is not None:
        longitude = Decimal(str(longitude))
    
    db_case = models.Case(
        patient=db_patient,
        triage_level=case_triage,
        symptoms=identified_symptoms,
        location=case.location,
        latitude=latitude,
        longitude=longitude
    )
    
    db.add(db_patient)
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    db.refresh(db_patient)
    
    # --- Step 4: Find and dispatch the best available ambulance ---
    try:
        from .maps import find_best_ambulance_with_routes
        
        if case.latitude and case.longitude:
            # Find the best ambulance using smart selection
            best_ambulance_data = find_best_ambulance_with_routes(
                float(case.latitude), 
                float(case.longitude), 
                ambulance_type, 
                db
            )
            
            if best_ambulance_data:
                selected_ambulance = best_ambulance_data["ambulance"]
                is_fallback = best_ambulance_data.get("is_fallback", False) or "fallback" in str(best_ambulance_data.get("selection_reason", ""))

                if is_fallback:
                    # All local units busy: keep case in priority Pending queue
                    db_case.status = "Pending"
                    db_patient.patient_status = "Pending"
                    db.commit()
                    print(f"[WARN] No local ambulance with fuel >50% available. Case {db_case.id} queued as Pending.")
                    print(f"   Standby reserve unit {selected_ambulance.vehicle_number} alerted.")
                else:
                    # Update ambulance status to 'dispatch'
                    selected_ambulance.status = "dispatch"  # pyright: ignore[reportAttributeAccessIssue]
                    # Update case status to 'Assigned'
                    db_case.status = "Assigned"
                    # Update patient status to 'Travelling' when ambulance is dispatched
                    db_patient.patient_status = "Travelling"
                    db.commit()
                    print(f"[OK] Dispatched ambulance {selected_ambulance.vehicle_number} for case {db_case.id}")
                    print(f"   Selection reason: {best_ambulance_data.get('selection_reason', 'N/A')}")
            else:
                print(f"[WARN] No suitable ambulance found for case {db_case.id}")
                db_case.status = "Pending"
                db_patient.patient_status = "Pending"
                db.commit()
        else:
            print(f"[WARN] No patient coordinates provided for case {db_case.id}")
            
    except Exception as e:
        print(f"[ERR] Error during ambulance dispatch: {e}")
        # Case is still created, just no ambulance dispatched
    
    return {
        "id": db_case.id,
        "triage_level": db_case.triage_level,
        "symptoms": db_case.symptoms,
        "status": db_case.status,
        "patient_name": db_case.patient.name
    }


@router.get("/all-recent", response_model=List[RecentCaseResponse])
async def get_all_recent_cases(db: Session = Depends(get_db)):
    """
    Fetches all recent cases and manually formats the data
    to match the RecentCaseResponse schema.
    """
    # Get all recent cases (ordered by ID descending = newest first)
    recent_cases_from_db = crud.get_recent_cases(db=db)
    
    if not recent_cases_from_db:
        return []

    # Manually create a list of dictionaries that matches the schema
    response_data = []
    for case in recent_cases_from_db:
        # The 'patient' object might not exist on very old records, so check for it
        if case.patient:
            # Convert Decimal to float for JSON serialization
            latitude = float(case.latitude) if case.latitude is not None else None  # type: ignore
            longitude = float(case.longitude) if case.longitude is not None else None  # type: ignore
            
            response_data.append({
                "id": case.id,
                "patient_name": case.patient.name,
                "age": case.patient.age,
                "gender": case.patient.gender,
                "contact": case.patient.contact,
                "symptoms": case.symptoms,
                "status": case.status,
                "triage_level": case.triage_level,
                "ambulance_type": case.patient.ambulance_type,
                "latitude": latitude,
                "longitude": longitude,
                "location": case.location
            })

    return response_data


# --- New endpoint to fetch live ambulance status ---
@router.get("/ambulances/status", response_model=List[AmbulanceStatusResponse])
async def get_dispatched_ambulances(db: Session = Depends(get_db)):
    """ Fetches all ambulances currently in 'dispatch' status. """
    dispatched = db.query(models.Ambulance).filter(models.Ambulance.status == 'dispatch').all()
    return dispatched

@router.get("/case/{case_id}/ambulance")
async def get_case_ambulance_details(case_id: int, db: Session = Depends(get_db)):
    """Get the dispatched ambulance details for a specific case."""
    # Find the case
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    
    # Find the dispatched ambulance for this case
    # Since we don't have a direct link, we'll find the most recently dispatched ambulance
    dispatched_ambulance = db.query(models.Ambulance).filter(
        models.Ambulance.status == 'dispatch'
    ).order_by(models.Ambulance.last_updated.desc()).first()
    
    if not dispatched_ambulance:
        # Check if case is Pending or no real ambulance is dispatched
        from .maps import create_fallback_ambulance, get_route_info
        fallback_amb = create_fallback_ambulance(case.patient.ambulance_type if case.patient else "Basic")
        route_info = None
        if case.latitude is not None and case.longitude is not None:
            try:
                route_info = get_route_info(
                    float(case.latitude),  # type: ignore
                    float(case.longitude),  # type: ignore
                    float(fallback_amb.latitude),  # type: ignore
                    float(fallback_amb.longitude)  # type: ignore
                )
            except Exception as e:
                print(f"Error getting standby route info: {e}")

        return {
            "case_id": case_id,
            "patient_name": case.patient.name if case.patient else "Unknown",
            "is_fallback": True,
            "queue_status": "Pending Dispatch - Standby Unit Alerted",
            "ambulance": {
                "ambulance_id": fallback_amb.ambulance_id,
                "vehicle_number": fallback_amb.vehicle_number,
                "type_of_ambulance": fallback_amb.type_of_ambulance,
                "current_location": fallback_amb.current_location,
                "latitude": float(fallback_amb.latitude) if fallback_amb.latitude is not None else 0.0,
                "longitude": float(fallback_amb.longitude) if fallback_amb.longitude is not None else 0.0,
                "no_of_staffs": fallback_amb.no_of_staffs,
                "fuel_level": fallback_amb.fuel_level,
                "status": "standby"
            },
            "route": route_info,
            "patient_location": {
                "latitude": float(case.latitude) if case.latitude is not None else 0.0,
                "longitude": float(case.longitude) if case.longitude is not None else 0.0,
                "address": case.location
            }
        }
    
    # If we have patient coordinates, get route information
    route_info = None
    if (case.latitude is not None and case.longitude is not None and 
        dispatched_ambulance.latitude is not None and dispatched_ambulance.longitude is not None):
        try:
            from .maps import get_route_info
            route_info = get_route_info(
                float(case.latitude),  # type: ignore
                float(case.longitude),  # type: ignore
                float(dispatched_ambulance.latitude),  # type: ignore
                float(dispatched_ambulance.longitude)  # type: ignore
            )
        except Exception as e:
            print(f"Error getting route info: {e}")
    
    return {
        "case_id": case_id,
        "patient_name": case.patient.name if case.patient else "Unknown",
        "ambulance": {
            "ambulance_id": dispatched_ambulance.ambulance_id,
            "vehicle_number": dispatched_ambulance.vehicle_number,
            "type_of_ambulance": dispatched_ambulance.type_of_ambulance,
            "current_location": dispatched_ambulance.current_location,
            "latitude": float(dispatched_ambulance.latitude) if dispatched_ambulance.latitude is not None else 0.0,  # type: ignore
            "longitude": float(dispatched_ambulance.longitude) if dispatched_ambulance.longitude is not None else 0.0,  # type: ignore
            "no_of_staffs": dispatched_ambulance.no_of_staffs,
            "fuel_level": dispatched_ambulance.fuel_level,
            "status": dispatched_ambulance.status
        },
        "route": route_info,
        "patient_location": {
            "latitude": float(case.latitude) if case.latitude is not None else 0.0,  # type: ignore
            "longitude": float(case.longitude) if case.longitude is not None else 0.0,  # type: ignore
            "address": case.location
        }
    }

