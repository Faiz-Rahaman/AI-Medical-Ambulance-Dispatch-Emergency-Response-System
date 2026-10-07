"""Test SOS dispatch with Vengal and Pallavaram coordinates."""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app.database import SessionLocal
from app import models
from app.routers.user_portal import _find_nearest_hospital
from app.routers.maps import find_best_ambulance_with_routes

db = SessionLocal()
try:
    print("=== TEST 1: User in Vengal College / Tiruvallur (13.2340, 80.0120) ===")
    vengal_lat, vengal_lon = 13.2340, 80.0120
    h_vengal = _find_nearest_hospital(vengal_lat, vengal_lon, db)
    print(f"Hospital assigned: {h_vengal.name} at {h_vengal.address}")
    amb_vengal_data = find_best_ambulance_with_routes(vengal_lat, vengal_lon, "Advanced", db)
    amb_vengal = amb_vengal_data.get("ambulance")
    route_vengal = amb_vengal_data.get("route", {})
    print(f"Ambulance dispatched: {amb_vengal.vehicle_number} ({amb_vengal.current_location})")
    print(f"Distance: {route_vengal.get('distance')}, ETA: {route_vengal.get('duration')}")
    print(f"Selection Reason: {amb_vengal_data.get('selection_reason')}")

    print("\n=== TEST 2: User in Pallavaram, Chennai (12.9675, 80.1491) ===")
    palla_lat, palla_lon = 12.9675, 80.1491
    h_palla = _find_nearest_hospital(palla_lat, palla_lon, db)
    print(f"Hospital assigned: {h_palla.name} at {h_palla.address}")
    amb_palla_data = find_best_ambulance_with_routes(palla_lat, palla_lon, "Advanced", db)
    amb_palla = amb_palla_data.get("ambulance")
    route_palla = amb_palla_data.get("route", {})
    print(f"Ambulance dispatched: {amb_palla.vehicle_number} ({amb_palla.current_location})")
    print(f"Distance: {route_palla.get('distance')}, ETA: {route_palla.get('duration')}")
    print(f"Selection Reason: {amb_palla_data.get('selection_reason')}")

finally:
    db.close()
