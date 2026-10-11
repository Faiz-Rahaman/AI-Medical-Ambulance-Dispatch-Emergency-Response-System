#!/usr/bin/env python3
"""
Seed and refresh the Chennai / Pallavaram ambulance and hospital network.
Properly assigns hospital_id to hospital fleet ambulances and marks standby
units as hospital_id=None (reserved rapid response).
Resets all ambulance statuses to 'available' with high fuel (>85%)
for reliable demonstrations.
"""
import sys, os
from decimal import Decimal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models

def seed_city_network():
    db = SessionLocal()
    try:
        print("[INFO] Seeding Chennai City Hospital & Ambulance Network...")

        # 1. Ensure core Chennai Hospitals exist
        city_hospitals = [
            {
                "name": "Apollo Hospital, Pallavaram",
                "address": "GST Road, Pallavaram, Chennai - 600043",
                "latitude": Decimal('12.9675'),
                "longitude": Decimal('80.1491'),
                "contact": "+91 44 2266 1111",
                "available_beds": 80
            },
            {
                "name": "Chromepet GH (ESI Hospital)",
                "address": "GST Road, Chromepet, Chennai - 600044",
                "latitude": Decimal('12.9516'),
                "longitude": Decimal('80.1462'),
                "contact": "+91 44 2238 2222",
                "available_beds": 120
            },
            {
                "name": "Sri Ramachandra Hospital, Porur",
                "address": "No. 1, Ramachandra Nagar, Porur, Chennai - 600116",
                "latitude": Decimal('13.0382'),
                "longitude": Decimal('80.1565'),
                "contact": "+91 44 4592 8500",
                "available_beds": 250
            },
            {
                "name": "SIMS Hospital, Vadapalani",
                "address": "No. 1, Jawaharlal Nehru Salai, Vadapalani, Chennai - 600026",
                "latitude": Decimal('13.0524'),
                "longitude": Decimal('80.2119'),
                "contact": "+91 44 4567 7777",
                "available_beds": 150
            },
            {
                "name": "Fortis Malar Hospital",
                "address": "No. 52, 1st Main Road, Gandhi Nagar, Adyar, Chennai - 600020",
                "latitude": Decimal('13.0067'),
                "longitude": Decimal('80.2565'),
                "contact": "+91 44 4289 2222",
                "available_beds": 90
            },
            {
                "name": "MIOT International",
                "address": "4/112, Mount Poonamallee Rd, Manapakkam, Chennai - 600089",
                "latitude": Decimal('13.0205'),
                "longitude": Decimal('80.1772'),
                "contact": "+91 44 4200 2288",
                "available_beds": 200
            }
        ]

        hosp_map = {}
        for h_data in city_hospitals:
            h = db.query(models.Hospital).filter(models.Hospital.name == h_data["name"]).first()
            if not h:
                h = models.Hospital(**h_data)
                db.add(h)
                db.commit()
                db.refresh(h)
                print(f"  [+] Added Hospital: {h.name} (id={h.id})")
            else:
                h.latitude = h_data["latitude"]
                h.longitude = h_data["longitude"]
                db.commit()
                db.refresh(h)
            hosp_map[h.name] = h.id

        apollo_pal_id = hosp_map.get("Apollo Hospital, Pallavaram")
        chromepet_gh_id = hosp_map.get("Chromepet GH (ESI Hospital)")
        porur_id = hosp_map.get("Sri Ramachandra Hospital, Porur")
        sims_id = hosp_map.get("SIMS Hospital, Vadapalani")
        fortis_id = hosp_map.get("Fortis Malar Hospital")
        miot_id = hosp_map.get("MIOT International")

        # 2. Define City Ambulances:
        # A mix of Hospital-fleet units (hospital_id set) and Standby / Reserved units (hospital_id=None)
        city_ambulances = [
            # --- STANDBY / RESERVED RAPID RESPONSE UNITS (hospital_id = None) ---
            # Perfect for City Emergency (Tier-2) near Olympia Grande, Pallavaram
            {
                "vehicle_number": "TN-11-RES-001",
                "type_of_ambulance": "Advanced",
                "no_of_staffs": 3,
                "current_location": "GST Road Rapid Response Post, Pallavaram Flyover",
                "latitude": Decimal('12.9690'),
                "longitude": Decimal('80.1480'),
                "status": "available",
                "fuel_level": 95,
                "hospital_id": None
            },
            {
                "vehicle_number": "TN-07-ICU-006",
                "type_of_ambulance": "ICU",
                "no_of_staffs": 4,
                "current_location": "Tambaram Emergency Standby Bay, Chennai",
                "latitude": Decimal('12.9269'),
                "longitude": Decimal('80.1159'),
                "status": "available",
                "fuel_level": 92,
                "hospital_id": None
            },
            {
                "vehicle_number": "TN-22-ADV-011",
                "type_of_ambulance": "Advanced",
                "no_of_staffs": 3,
                "current_location": "Guindy Metro Rapid Standby Post, Chennai",
                "latitude": Decimal('13.0067'),
                "longitude": Decimal('80.2026'),
                "status": "available",
                "fuel_level": 88,
                "hospital_id": None
            },
            {
                "vehicle_number": "TN-07-BAS-004",
                "type_of_ambulance": "Basic",
                "no_of_staffs": 2,
                "current_location": "Adyar Standby Post, Chennai",
                "latitude": Decimal('12.9893'),
                "longitude": Decimal('80.2269'),
                "status": "available",
                "fuel_level": 89,
                "hospital_id": None
            },
            {
                "vehicle_number": "TN-10-BAS-009",
                "type_of_ambulance": "Basic",
                "no_of_staffs": 2,
                "current_location": "Koyambedu Junction Emergency Post, Chennai",
                "latitude": Decimal('13.0694'),
                "longitude": Decimal('80.1948'),
                "status": "available",
                "fuel_level": 85,
                "hospital_id": None
            },
            {
                "vehicle_number": "TN-07-ADV-005",
                "type_of_ambulance": "Advanced",
                "no_of_staffs": 3,
                "current_location": "Velachery Standby Post, Chennai",
                "latitude": Decimal('12.9808'),
                "longitude": Decimal('80.2167'),
                "status": "available",
                "fuel_level": 87,
                "hospital_id": None
            },

            # --- HOSPITAL FLEET AMBULANCES (hospital_id != None) ---
            # Used for Non-Emergency / Clinical Transport (Tier-1)
            {
                "vehicle_number": "TN-11-ADV-017",
                "type_of_ambulance": "Advanced",
                "no_of_staffs": 3,
                "current_location": "Chromepet GH Ambulance Bay, Chennai",
                "latitude": Decimal('12.9516'),
                "longitude": Decimal('80.1462'),
                "status": "available",
                "fuel_level": 94,
                "hospital_id": chromepet_gh_id
            },
            {
                "vehicle_number": "TN-09-BAS-018",
                "type_of_ambulance": "Basic",
                "no_of_staffs": 2,
                "current_location": "Sri Ramachandra Hospital, Porur, Chennai",
                "latitude": Decimal('13.0382'),
                "longitude": Decimal('80.1565'),
                "status": "available",
                "fuel_level": 91,
                "hospital_id": porur_id
            },
            {
                "vehicle_number": "TN-22-ICU-010",
                "type_of_ambulance": "ICU",
                "no_of_staffs": 4,
                "current_location": "MIOT International, Manapakkam, Chennai",
                "latitude": Decimal('13.0205'),
                "longitude": Decimal('80.1772'),
                "status": "available",
                "fuel_level": 96,
                "hospital_id": miot_id
            },
            {
                "vehicle_number": "TN-09-ICU-007",
                "type_of_ambulance": "ICU",
                "no_of_staffs": 4,
                "current_location": "SIMS Hospital, Vadapalani, Chennai",
                "latitude": Decimal('13.0524'),
                "longitude": Decimal('80.2119'),
                "status": "available",
                "fuel_level": 93,
                "hospital_id": sims_id
            },
            {
                "vehicle_number": "TN-07-BAS-014",
                "type_of_ambulance": "Basic",
                "no_of_staffs": 2,
                "current_location": "Fortis Malar Hospital Bay, Adyar, Chennai",
                "latitude": Decimal('13.0067'),
                "longitude": Decimal('80.2565'),
                "status": "available",
                "fuel_level": 88,
                "hospital_id": fortis_id
            },
            {
                "vehicle_number": "TN-07-BAS-001",
                "type_of_ambulance": "Basic",
                "no_of_staffs": 2,
                "current_location": "Chennai Central Station Bay",
                "latitude": Decimal('13.0827'),
                "longitude": Decimal('80.2707'),
                "status": "available",
                "fuel_level": 95,
                "hospital_id": None
            }
        ]

        # Reset all existing ambulances to available + update
        db.query(models.Ambulance).update({
            models.Ambulance.status: "available",
            models.Ambulance.fuel_level: 90
        })
        db.commit()

        for a_data in city_ambulances:
            existing = db.query(models.Ambulance).filter(
                models.Ambulance.vehicle_number == a_data["vehicle_number"]
            ).first()
            if not existing:
                amb = models.Ambulance(**a_data)
                db.add(amb)
                print(f"  [+] Added Ambulance: {a_data['vehicle_number']} ({a_data['type_of_ambulance']}) hosp_id={a_data['hospital_id']}")
            else:
                existing.type_of_ambulance = a_data["type_of_ambulance"]
                existing.current_location = a_data["current_location"]
                existing.latitude = a_data["latitude"]
                existing.longitude = a_data["longitude"]
                existing.status = a_data["status"]
                existing.fuel_level = a_data["fuel_level"]
                existing.hospital_id = a_data["hospital_id"]
                print(f"  [*] Updated Ambulance: {existing.vehicle_number} hosp_id={existing.hospital_id}")

        db.commit()
        print("[SUCCESS] City network seeded and all ambulances reset to 'available'!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_city_network()
