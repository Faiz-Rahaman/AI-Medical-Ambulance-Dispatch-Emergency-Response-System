import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app import models
from app.prompts import DEFAULT_MEDICAL_SYSTEM_PROMPT

db = SessionLocal()
try:
    prompts = db.query(models.SystemPrompt).all()
    if not prompts:
        print("No prompts found, creating one...")
        new_prompt = models.SystemPrompt(prompt=DEFAULT_MEDICAL_SYSTEM_PROMPT)
        db.add(new_prompt)
        db.commit()
        print("Created new system prompt with length:", len(DEFAULT_MEDICAL_SYSTEM_PROMPT))
    else:
        for p in prompts:
            print(f"Updating prompt ID {p.id}...")
            p.prompt = DEFAULT_MEDICAL_SYSTEM_PROMPT
        db.commit()
        print(f"Successfully updated {len(prompts)} prompt record(s) in database to updated prompt!")

    # Verify
    first = db.query(models.SystemPrompt).first()
    print("Verification - Prompt ID:", first.id)
    print("Verification - Prompt preview:")
    print(first.prompt[:300])
finally:
    db.close()
