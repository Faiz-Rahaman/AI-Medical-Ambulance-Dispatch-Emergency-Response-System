from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from ..database import get_db
from .. import models, schemas
from ..auth import get_current_user, require_role

router = APIRouter(prefix="/hospital", tags=["hospital"])


@router.get("/cases")
def get_hospital_cases(
    status: Optional[str] = Query(None, description="Filter by case status"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["hospital", "admin"])),
):
    query = db.query(models.Case).join(models.Patient, models.Case.patient_id == models.Patient.id)
    
    # If the user is a hospital user with a specific hospital_id, show cases for that hospital OR unassigned cases
    if current_user.role == "hospital" and current_user.hospital_id:
        query = query.filter(
            (models.Case.hospital_id == current_user.hospital_id) | (models.Case.hospital_id == None)
        )

    if status:
        query = query.filter(models.Case.status == status)

    cases = query.order_by(models.Case.id.desc()).all()

    result = []
    for c in cases:
        result.append({
            "id": c.id,
            "patient_id": c.patient_id,
            "patient_name": c.patient.name if c.patient else "Unknown",
            "age": c.patient.age if c.patient else None,
            "gender": c.patient.gender if c.patient else None,
            "contact": c.patient.contact if c.patient else None,
            "patient_triage": c.patient.patient_triage if c.patient else "Red",
            "ambulance_type": c.patient.ambulance_type if c.patient else "Basic",
            "triage_level": c.triage_level,
            "symptoms": c.symptoms,
            "location": c.location,
            "latitude": float(c.latitude) if c.latitude is not None else None,
            "longitude": float(c.longitude) if c.longitude is not None else None,
            "status": c.status,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "hospital_id": c.hospital_id,
        })
    return result


@router.put("/cases/{case_id}/status")
def update_case_status(
    case_id: int,
    status_update: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["hospital", "admin"])),
):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    new_status = status_update.get("status")
    if new_status:
        case.status = new_status
        if case.patient:
            if new_status == "Completed":
                case.patient.patient_status = "Admitted"
            elif new_status == "Assigned":
                case.patient.patient_status = "Travelling"

    # Optionally assign to current hospital
    if current_user.hospital_id:
        case.hospital_id = current_user.hospital_id

    db.commit()
    db.refresh(case)
    return {"message": "Case updated successfully", "id": case.id, "status": case.status}


@router.get("/ambulances")
def get_hospital_ambulances(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["hospital", "admin"])),
):
    query = db.query(models.Ambulance)
    if current_user.role == "hospital" and current_user.hospital_id:
        query = query.filter(
            (models.Ambulance.hospital_id == current_user.hospital_id) | (models.Ambulance.hospital_id == None)
        )

    ambulances = query.all()
    result = []
    for amb in ambulances:
        result.append({
            "ambulance_id": amb.ambulance_id,
            "vehicle_number": amb.vehicle_number,
            "type_of_ambulance": amb.type_of_ambulance,
            "status": amb.status,
            "current_location": amb.current_location,
            "latitude": float(amb.latitude) if amb.latitude is not None else None,
            "longitude": float(amb.longitude) if amb.longitude is not None else None,
            "fuel_level": amb.fuel_level,
            "no_of_staffs": amb.no_of_staffs,
            "hospital_id": amb.hospital_id,
        })
    return result


@router.put("/ambulances/{ambulance_id}/status")
def update_ambulance_status(
    ambulance_id: int,
    payload: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["hospital", "admin"])),
):
    amb = db.query(models.Ambulance).filter(models.Ambulance.ambulance_id == ambulance_id).first()
    if not amb:
        raise HTTPException(status_code=404, detail="Ambulance not found")

    new_status = payload.get("status")
    if new_status:
        amb.status = new_status
    if "current_location" in payload:
        amb.current_location = payload["current_location"]
    if "fuel_level" in payload:
        amb.fuel_level = payload["fuel_level"]

    db.commit()
    db.refresh(amb)
    return {"message": "Ambulance status updated", "ambulance_id": amb.ambulance_id, "status": amb.status}


@router.get("/tracking")
def get_hospital_tracking(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role(["hospital", "admin"])),
):
    # Active emergency dispatches (Assigned or Pending with coordinates)
    active_cases = (
        db.query(models.Case)
        .join(models.Patient, models.Case.patient_id == models.Patient.id)
        .filter(models.Case.status.in_(["Pending", "Assigned"]))
        .order_by(models.Case.id.desc())
        .limit(10)
        .all()
    )

    dispatches = []
    # Pick active ambulances
    available_ambs = db.query(models.Ambulance).all()

    for idx, c in enumerate(active_cases):
        assigned_amb = available_ambs[idx % len(available_ambs)] if available_ambs else None
        dispatches.append({
            "case_id": c.id,
            "patient_name": c.patient.name if c.patient else "Emergency Patient",
            "patient_contact": c.patient.contact if c.patient else None,
            "triage_level": c.triage_level,
            "symptoms": c.symptoms,
            "patient_location": {
                "address": c.location,
                "latitude": float(c.latitude) if c.latitude is not None else 12.9675,
                "longitude": float(c.longitude) if c.longitude is not None else 80.1491,
            },
            "ambulance": {
                "ambulance_id": assigned_amb.ambulance_id if assigned_amb else idx + 1,
                "vehicle_number": assigned_amb.vehicle_number if assigned_amb else f"AMB-{idx+101}",
                "type": assigned_amb.type_of_ambulance if assigned_amb else "Advanced",
                "status": assigned_amb.status if assigned_amb else "dispatch",
                "latitude": float(assigned_amb.latitude) if assigned_amb and assigned_amb.latitude is not None else 12.9675,
                "longitude": float(assigned_amb.longitude) if assigned_amb and assigned_amb.longitude is not None else 80.1491,
            } if assigned_amb else None,
            "eta_minutes": 8 + (idx * 3),
            "status": c.status,
        })

    return dispatches
