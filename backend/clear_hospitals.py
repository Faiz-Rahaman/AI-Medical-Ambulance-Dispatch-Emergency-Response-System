"""Update old Bengaluru hospitals to Chennai-area locations and add new Chennai hospitals."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from decimal import Decimal
from app.database import SessionLocal
from app import models

db = SessionLocal()
try:
    chennai_hospitals = [
        {"name": "Apollo Hospital, Pallavaram", "address": "GST Road, Pallavaram, Chennai - 600043", "latitude": Decimal("12.9675"), "longitude": Decimal("80.1491"), "contact": "+91 44 2000 0001", "available_beds": 24},
        {"name": "Fortis Malar Hospital", "address": "52 1st Main Rd, Gandhi Nagar, Adyar, Chennai - 600020", "latitude": Decimal("13.0067"), "longitude": Decimal("80.2565"), "contact": "+91 44 2000 0002", "available_beds": 30},
        {"name": "SIMS Hospital, Vadapalani", "address": "1 Jawaharlal Nehru Salai, Vadapalani, Chennai - 600026", "latitude": Decimal("13.0524"), "longitude": Decimal("80.2119"), "contact": "+91 44 2000 0003", "available_beds": 28},
        {"name": "Tiruvallur Government Hospital", "address": "Hospital Road, Tiruvallur - 602001", "latitude": Decimal("13.1427"), "longitude": Decimal("79.9120"), "contact": "+91 44 2000 0004", "available_beds": 40},
        {"name": "Sri Ramachandra Hospital, Porur", "address": "No.1, Ramachandra Nagar, Porur, Chennai - 600116", "latitude": Decimal("13.0382"), "longitude": Decimal("80.1565"), "contact": "+91 44 2000 0005", "available_beds": 35},
        {"name": "Chromepet GH (ESI Hospital)", "address": "GST Road, Chromepet, Chennai - 600044", "latitude": Decimal("12.9516"), "longitude": Decimal("80.1462"), "contact": "+91 44 2000 0006", "available_beds": 22},
    ]

    existing = db.query(models.Hospital).all()
    for i, h in enumerate(existing):
        if i < len(chennai_hospitals):
            data = chennai_hospitals[i]
            h.name = data["name"]
            h.address = data["address"]
            h.latitude = data["latitude"]
            h.longitude = data["longitude"]
            h.contact = data["contact"]
            h.available_beds = data["available_beds"]
            print(f"[UPDATED] Hospital #{h.id} -> {data['name']}")

    for i in range(len(existing), len(chennai_hospitals)):
        data = chennai_hospitals[i]
        new_h = models.Hospital(**data)
        db.add(new_h)
        print(f"[ADDED] Hospital -> {data['name']}")

    db.commit()
    print(f"\nHospitals updated. Current list:")
    for h in db.query(models.Hospital).all():
        print(f"  #{h.id}: {h.name} ({h.latitude}, {h.longitude})")

    # Also check and inspect ambulances in the DB
    print("\nAmbulances in DB:")
    ambs = db.query(models.Ambulance).all()
    print(f"Total ambulances: {len(ambs)}")
    for a in ambs:
        print(f"  #{a.ambulance_id}: {a.vehicle_number} | {a.current_location} | ({a.latitude}, {a.longitude}) | status: {a.status} | fuel: {a.fuel_level}")

finally:
    db.close()
