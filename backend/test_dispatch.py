#!/usr/bin/env python3
"""
Test the three-tier severity-aware dispatch algorithm.

Tier 1  - Non-Emergency (Clinical / Transport): hospital ambulances only
Tier 2  - Emergency in City (high hospital density): nearest any ambulance
Tier 3  - Emergency in Remote (low hospital density): reserved / standby first

Demo locations:
  City   -> Olympia Grande Apts, Pallavaram, Chennai  (12.9676, 80.1534)
  Remote -> Amrita College, Vengal, Tiruvallur         (13.2356, 80.0140)
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from app.routers.maps import (
    find_best_ambulance_with_routes,
    is_remote_location,
    calculate_distance,
)

CITY_LAT, CITY_LON = 12.9676, 80.1534      # Olympia Grande, Pallavaram
REMOTE_LAT, REMOTE_LON = 13.2356, 80.0140  # Amrita College, Vengal


def run_tests():
    db = SessionLocal()
    try:
        total = db.query(models.Ambulance).filter(models.Ambulance.status == "available").count()
        hospital_amb = db.query(models.Ambulance).filter(
            models.Ambulance.status == "available",
            models.Ambulance.hospital_id.isnot(None)
        ).count()
        standalone_amb = db.query(models.Ambulance).filter(
            models.Ambulance.status == "available",
            models.Ambulance.hospital_id.is_(None)
        ).count()

        print("=" * 70)
        print("       SEVERITY-AWARE DISPATCH -- TEST SUITE")
        print("=" * 70)
        print(f"  Available ambulances : {total}")
        print(f"    Hospital-attached  : {hospital_amb}")
        print(f"    Standalone/reserved: {standalone_amb}")
        print()

        # -- 1. Remote-check heuristic --
        print("-" * 70)
        print("TEST 1: Location classification (hospital density)")
        print("-" * 70)
        city_remote = is_remote_location(CITY_LAT, CITY_LON, db)
        vengal_remote = is_remote_location(REMOTE_LAT, REMOTE_LON, db)
        print(f"  Olympia Grande, Pallavaram : {'REMOTE !!' if city_remote else 'CITY [OK]'}")
        print(f"  Amrita College, Vengal     : {'REMOTE [OK]' if vengal_remote else 'CITY !!'}")
        print()

        scenarios = [
            # (Label,               Lat,        Lon,        Severity,      Expected tier keyword)
            ("NON-EMERGENCY  -- City (knee injury)",  CITY_LAT,   CITY_LON,   "Clinical",    "Tier-1"),
            ("NON-EMERGENCY  -- Remote",              REMOTE_LAT, REMOTE_LON, "Transport",   "Tier-1"),
            ("EMERGENCY      -- City (heart attack)", CITY_LAT,   CITY_LON,   "Emergency",   "Tier-2"),
            ("EMERGENCY      -- Remote (accident)",   REMOTE_LAT, REMOTE_LON, "Emergency",   "Tier-3"),
        ]

        for idx, (label, lat, lon, severity, expected) in enumerate(scenarios, start=2):
            print("-" * 70)
            print(f"TEST {idx}: {label}")
            print(f"  Location : ({lat}, {lon})   Severity: {severity}")
            print("-" * 70)
            result = find_best_ambulance_with_routes(lat, lon, "Any", db, severity=severity)
            if result:
                amb = result["ambulance"]
                tier = result.get("dispatch_tier", "?")
                reason = result.get("selection_reason", "")
                has_hospital = getattr(amb, 'hospital_id', None) is not None
                dist_km = calculate_distance(lat, lon,
                                             float(amb.latitude) if amb.latitude else 0,
                                             float(amb.longitude) if amb.longitude else 0)
                print(f"  >> Dispatch tier  : {tier}")
                print(f"  >> Ambulance      : {amb.vehicle_number} ({amb.type_of_ambulance})")
                print(f"  >> Location       : {amb.current_location}")
                print(f"  >> Hospital-linked: {'Yes' if has_hospital else 'No (standalone/reserved)'}")
                print(f"  >> Distance       : {dist_km:.1f} km")
                print(f"  >> Reason         : {reason}")

                # Validation
                if expected in tier:
                    print(f"  [PASS] -- matches expected {expected}")
                else:
                    print(f"  [MISMATCH] -- expected {expected}, got {tier}")
            else:
                print("  [FAIL] No ambulance found!")
            print()

        print("=" * 70)
        print("  ALL TESTS COMPLETE")
        print("=" * 70)

    finally:
        db.close()


if __name__ == "__main__":
    run_tests()
