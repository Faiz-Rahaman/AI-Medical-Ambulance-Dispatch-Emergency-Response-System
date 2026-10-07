import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from app.database import SessionLocal
from app import models

db = SessionLocal()
try:
    dummy_contacts = [
        "+91 44 2000 0001",
        "+91 44 2000 0002",
        "+91 44 2000 0003",
        "+91 44 2000 0004",
        "+91 44 2000 0005",
        "+91 44 2000 0006",
    ]
    for i, h in enumerate(db.query(models.Hospital).all()):
        h.contact = dummy_contacts[i % len(dummy_contacts)]
        print(f"Hospital {h.name} contact updated to {h.contact}")
    db.commit()
    print("Database contacts successfully sanitized.")
finally:
    db.close()
