# backend/app/routers/admin.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from decimal import Decimal
from .. import models
from ..database import get_db
from pydantic import BaseModel
from ..prompts import DEFAULT_MEDICAL_SYSTEM_PROMPT

router = APIRouter(prefix="/admin", tags=["Admin"])

# Response schemas
class PatientResponse(BaseModel):
    id: int
    name: str
    age: int
    gender: str
    contact: str
    patient_triage: str
    ambulance_type: str
    patient_status: str

    class Config:
        from_attributes = True

class AmbulanceResponse(BaseModel):
    ambulance_id: int
    type_of_ambulance: str
    vehicle_number: str
    no_of_staffs: int
    current_location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    fuel_level: int
    last_updated: Optional[str] = None

    class Config:
        from_attributes = True

class StaffResponse(BaseModel):
    staff_id: int
    ambulance_id: Optional[int] = None
    role: str
    staff_status: str

    class Config:
        from_attributes = True

# Request schema for creating ambulance
class AmbulanceCreate(BaseModel):
    type_of_ambulance: str
    vehicle_number: str
    no_of_staffs: int
    current_location: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "available"
    fuel_level: int


class SystemPromptResponse(BaseModel):
    prompt: str
    updated_at: Optional[str] = None


class SystemPromptUpdate(BaseModel):
    prompt: str


def _get_or_create_system_prompt(db: Session) -> models.SystemPrompt:
    prompt_entry = db.query(models.SystemPrompt).order_by(models.SystemPrompt.id.asc()).first()
    if not prompt_entry:
        prompt_entry = models.SystemPrompt(prompt=DEFAULT_MEDICAL_SYSTEM_PROMPT)
        db.add(prompt_entry)
        db.commit()
        db.refresh(prompt_entry)
    return prompt_entry

@router.get("/patients", response_model=List[PatientResponse])
async def get_all_patients(db: Session = Depends(get_db)):
    """Get all patients from the database."""
    patients = db.query(models.Patient).all()
    return patients

@router.get("/ambulances", response_model=List[AmbulanceResponse])
async def get_all_ambulances(db: Session = Depends(get_db)):
    """Get all ambulances from the database."""
    ambulances = db.query(models.Ambulance).all()
    result = []
    for ambulance in ambulances:
        ambulance_dict = {
            "ambulance_id": ambulance.ambulance_id,
            "type_of_ambulance": ambulance.type_of_ambulance,
            "vehicle_number": ambulance.vehicle_number,
            "no_of_staffs": ambulance.no_of_staffs,
            "current_location": ambulance.current_location,
            "latitude": float(ambulance.latitude) if ambulance.latitude else None,
            "longitude": float(ambulance.longitude) if ambulance.longitude else None,
            "status": ambulance.status,
            "fuel_level": ambulance.fuel_level,
            "last_updated": ambulance.last_updated.isoformat() if ambulance.last_updated else None
        }
        result.append(ambulance_dict)
    return result

@router.get("/staffs", response_model=List[StaffResponse])
async def get_all_staffs(db: Session = Depends(get_db)):
    """Get all staff members from the database."""
    staffs = db.query(models.Staff).all()
    return staffs

@router.post("/ambulances", response_model=AmbulanceResponse)
async def create_ambulance(ambulance: AmbulanceCreate, db: Session = Depends(get_db)):
    """Create a new ambulance in the database."""
    # Check if vehicle number already exists
    existing = db.query(models.Ambulance).filter(models.Ambulance.vehicle_number == ambulance.vehicle_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Vehicle number already exists")
    
    # Validate enum values
    valid_types = ["Basic", "Advanced", "ICU"]
    if ambulance.type_of_ambulance not in valid_types:
        raise HTTPException(status_code=400, detail=f"Invalid ambulance type. Must be one of: {valid_types}")
    
    valid_statuses = ["available", "dispatch", "out_of_services", "maintenance"]
    if ambulance.status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    # Convert latitude/longitude to Decimal if provided
    latitude = Decimal(str(ambulance.latitude)) if ambulance.latitude is not None else None
    longitude = Decimal(str(ambulance.longitude)) if ambulance.longitude is not None else None

    # Auto-resolve coordinates if missing but location description is present
    if (latitude is None or longitude is None) and ambulance.current_location:
        try:
            from .maps import gmaps
            if gmaps:
                query = f"{ambulance.current_location}, Chennai" if "chennai" not in ambulance.current_location.lower() else ambulance.current_location
                geocode_res = gmaps.geocode(query)
                if geocode_res and len(geocode_res) > 0:
                    loc = geocode_res[0]['geometry']['location']
                    latitude = Decimal(str(loc['lat']))
                    longitude = Decimal(str(loc['lng']))
        except Exception as e:
            print(f"Error auto-resolving coordinates for ambulance: {e}")
    
    # Create new ambulance
    db_ambulance = models.Ambulance(
        type_of_ambulance=ambulance.type_of_ambulance,
        vehicle_number=ambulance.vehicle_number,
        no_of_staffs=ambulance.no_of_staffs,
        current_location=ambulance.current_location,
        latitude=latitude,
        longitude=longitude,
        status=ambulance.status,
        fuel_level=ambulance.fuel_level
    )
    
    db.add(db_ambulance)
    db.commit()
    db.refresh(db_ambulance)
    
    # Return in the same format as GET endpoint
    return {
        "ambulance_id": db_ambulance.ambulance_id,
        "type_of_ambulance": db_ambulance.type_of_ambulance,
        "vehicle_number": db_ambulance.vehicle_number,
        "no_of_staffs": db_ambulance.no_of_staffs,
        "current_location": db_ambulance.current_location,
        "latitude": float(db_ambulance.latitude) if db_ambulance.latitude else None,
        "longitude": float(db_ambulance.longitude) if db_ambulance.longitude else None,
        "status": db_ambulance.status,
        "fuel_level": db_ambulance.fuel_level,
        "last_updated": db_ambulance.last_updated.isoformat() if db_ambulance.last_updated else None
    }


@router.get("/system-prompt", response_model=SystemPromptResponse)
async def get_system_prompt(db: Session = Depends(get_db)):
    prompt_entry = _get_or_create_system_prompt(db)
    return {
        "prompt": prompt_entry.prompt,
        "updated_at": prompt_entry.updated_at.isoformat() if prompt_entry.updated_at else None
    }


@router.put("/system-prompt", response_model=SystemPromptResponse)
async def update_system_prompt(payload: SystemPromptUpdate, db: Session = Depends(get_db)):
    if not payload.prompt or not payload.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    prompt_entry = _get_or_create_system_prompt(db)
    prompt_value = payload.prompt.strip()
    setattr(prompt_entry, "prompt", prompt_value)
    db.add(prompt_entry)
    db.commit()
    db.refresh(prompt_entry)

    return {
        "prompt": prompt_entry.prompt,
        "updated_at": prompt_entry.updated_at.isoformat() if prompt_entry.updated_at else None
    }


# ==========================================
# --- USER MANAGEMENT ENDPOINTS ---
# ==========================================

@router.get("/users")
async def get_all_users(db: Session = Depends(get_db)):
    """List all registered users."""
    users = db.query(models.User).order_by(models.User.id.desc()).all()
    result = []
    for u in users:
        h_name = None
        if u.hospital_id:
            h = db.query(models.Hospital).filter(models.Hospital.id == u.hospital_id).first()
            if h:
                h_name = h.name
        result.append({
            "id": u.id,
            "name": u.name,
            "email": u.email,
            "role": u.role,
            "hospital_id": u.hospital_id,
            "hospital_name": h_name,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return result


@router.post("/users")
async def create_user(payload: dict, db: Session = Depends(get_db)):
    """Create a new user from Admin panel."""
    from ..auth import get_password_hash
    email = payload.get("email", "").strip().lower()
    name = payload.get("name", "").strip()
    password = payload.get("password", "password123")
    role = payload.get("role", "user")
    hospital_id = payload.get("hospital_id")

    if not email or not name:
        raise HTTPException(status_code=400, detail="Name and email are required.")

    existing = db.query(models.User).filter(models.User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists.")

    new_user = models.User(
        email=email,
        name=name,
        password_hash=get_password_hash(password),
        role=role,
        hospital_id=hospital_id if hospital_id else None,
        is_active=1,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User created successfully", "id": new_user.id}


@router.put("/users/{user_id}")
async def update_user(user_id: int, payload: dict, db: Session = Depends(get_db)):
    """Update user information."""
    from ..auth import get_password_hash
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "name" in payload and payload["name"]:
        user.name = payload["name"].strip()
    if "email" in payload and payload["email"]:
        user.email = payload["email"].strip().lower()
    if "role" in payload and payload["role"]:
        user.role = payload["role"]
    if "hospital_id" in payload:
        user.hospital_id = payload["hospital_id"] if payload["hospital_id"] else None
    if "is_active" in payload:
        user.is_active = int(payload["is_active"])
    if "password" in payload and payload["password"]:
        user.password_hash = get_password_hash(payload["password"])

    db.commit()
    db.refresh(user)
    return {"message": "User updated successfully", "id": user.id}


@router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Delete a user."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()
    return {"message": "User deleted successfully", "id": user_id}


# ==========================================
# --- HOSPITAL MANAGEMENT ENDPOINTS ---
# ==========================================

@router.get("/hospitals")
async def get_all_hospitals(db: Session = Depends(get_db)):
    """List all registered hospitals."""
    hospitals = db.query(models.Hospital).order_by(models.Hospital.id.asc()).all()
    result = []
    for h in hospitals:
        result.append({
            "id": h.id,
            "name": h.name,
            "address": h.address,
            "latitude": float(h.latitude) if h.latitude is not None else None,
            "longitude": float(h.longitude) if h.longitude is not None else None,
            "contact": h.contact,
            "available_beds": h.available_beds,
            "created_at": h.created_at.isoformat() if h.created_at else None,
        })
    return result


@router.post("/hospitals")
async def create_hospital(payload: dict, db: Session = Depends(get_db)):
    """Add a new hospital."""
    name = payload.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Hospital name is required.")

    latitude = payload.get("latitude")
    longitude = payload.get("longitude")

    # Auto-resolve coordinates if missing but address given
    address = payload.get("address", "")
    if (latitude is None or longitude is None) and address:
        try:
            from .maps import gmaps
            if gmaps:
                geocode_res = gmaps.geocode(f"{address}, India")
                if geocode_res and len(geocode_res) > 0:
                    loc = geocode_res[0]['geometry']['location']
                    latitude = loc['lat']
                    longitude = loc['lng']
        except Exception:
            pass

    hospital = models.Hospital(
        name=name,
        address=address,
        latitude=Decimal(str(latitude)) if latitude is not None else None,
        longitude=Decimal(str(longitude)) if longitude is not None else None,
        contact=payload.get("contact", ""),
        available_beds=payload.get("available_beds", 10),
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return {"message": "Hospital created successfully", "id": hospital.id}


@router.put("/hospitals/{hospital_id}")
async def update_hospital(hospital_id: int, payload: dict, db: Session = Depends(get_db)):
    """Update hospital details."""
    h = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")

    if "name" in payload and payload["name"]:
        h.name = payload["name"].strip()
    if "address" in payload:
        h.address = payload["address"]
    if "contact" in payload:
        h.contact = payload["contact"]
    if "available_beds" in payload:
        h.available_beds = int(payload["available_beds"])
    if "latitude" in payload and payload["latitude"] is not None:
        h.latitude = Decimal(str(payload["latitude"]))
    if "longitude" in payload and payload["longitude"] is not None:
        h.longitude = Decimal(str(payload["longitude"]))

    db.commit()
    db.refresh(h)
    return {"message": "Hospital updated successfully", "id": h.id}


@router.delete("/hospitals/{hospital_id}")
async def delete_hospital(hospital_id: int, db: Session = Depends(get_db)):
    """Delete a hospital."""
    h = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
    if not h:
        raise HTTPException(status_code=404, detail="Hospital not found")
    db.delete(h)
    db.commit()
    return {"message": "Hospital deleted successfully", "id": hospital_id}


@router.delete("/ambulances/{ambulance_id}")
async def delete_ambulance(ambulance_id: int, db: Session = Depends(get_db)):
    """Delete an ambulance."""
    amb = db.query(models.Ambulance).filter(models.Ambulance.ambulance_id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")
    db.delete(amb)
    db.commit()
    return {"message": "Ambulance deleted successfully", "ambulance_id": ambulance_id}


