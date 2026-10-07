from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from contextlib import asynccontextmanager
import logging
import time
import asyncio
from sqlalchemy import text
from .routers import triage, medicalchat, maps, vapi, admin, auth, hospital, user_portal
from .database import Base, engine, SessionLocal
from .auth import get_password_hash
from . import models

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Background task: auto-complete old pending cases ---
async def _auto_complete_old_cases_loop():
    """Periodically mark Pending/Assigned cases older than 10 minutes as Completed."""
    while True:
        try:
            await asyncio.sleep(60)
            db = SessionLocal()
            try:
                db.execute(text(
                    """
                    UPDATE cases c
                    INNER JOIN patients p ON c.patient_id = p.id
                    SET c.status = 'Completed',
                        p.patient_status = 'Admitted'
                    WHERE c.status IN ('Pending', 'Assigned')
                      AND c.created_at IS NOT NULL
                      AND c.created_at < (NOW() - INTERVAL 10 MINUTE)
                    """
                ))
                db.commit()
            finally:
                db.close()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Auto-complete job failed: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure DB schema is compatible and seed initial demo data
    try:
        db = SessionLocal()
        try:
            def ensure_column(table_name, column_name, column_def):
                try:
                    result = db.execute(text(
                        f"""
                        SELECT COUNT(*) AS cnt
                        FROM information_schema.COLUMNS
                        WHERE TABLE_SCHEMA = DATABASE()
                          AND TABLE_NAME = '{table_name}'
                          AND COLUMN_NAME = '{column_name}'
                        """
                    ))
                    cnt = list(result)[0][0]
                    if cnt == 0:
                        db.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {column_def}"))
                        db.commit()
                        logger.info(f"Added column {column_name} to {table_name}")
                except Exception as col_err:
                    logger.warning(f"Column check/add for {table_name}.{column_name}: {col_err}")

            ensure_column("cases", "created_at", "TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP")
            ensure_column("cases", "hospital_id", "INT NULL")
            ensure_column("cases", "user_id", "INT NULL")
            ensure_column("ambulances", "hospital_id", "INT NULL")

            # Seed initial hospitals if table is empty
            hospital_count = db.query(models.Hospital).count()
            if hospital_count == 0:
                seed_hospitals = [
                    models.Hospital(
                        name="Apollo Hospital, Pallavaram",
                        address="GST Road, Pallavaram, Chennai - 600043",
                        latitude=12.9675, longitude=80.1491,
                        contact="+91 44 2000 0001", available_beds=24,
                    ),
                    models.Hospital(
                        name="Fortis Malar Hospital",
                        address="52 1st Main Rd, Gandhi Nagar, Adyar, Chennai - 600020",
                        latitude=13.0067, longitude=80.2565,
                        contact="+91 44 2000 0002", available_beds=30,
                    ),
                    models.Hospital(
                        name="SIMS Hospital, Vadapalani",
                        address="1 Jawaharlal Nehru Salai, Vadapalani, Chennai - 600026",
                        latitude=13.0524, longitude=80.2119,
                        contact="+91 44 2000 0003", available_beds=28,
                    ),
                    models.Hospital(
                        name="Tiruvallur Government Hospital",
                        address="Hospital Road, Tiruvallur - 602001",
                        latitude=13.1427, longitude=79.9120,
                        contact="+91 44 2000 0004", available_beds=40,
                    ),
                    models.Hospital(
                        name="Sri Ramachandra Hospital, Porur",
                        address="No.1, Ramachandra Nagar, Porur, Chennai - 600116",
                        latitude=13.0382, longitude=80.1565,
                        contact="+91 44 2000 0005", available_beds=35,
                    ),
                    models.Hospital(
                        name="Chromepet GH (ESI Hospital)",
                        address="GST Road, Chromepet, Chennai - 600044",
                        latitude=12.9516, longitude=80.1462,
                        contact="+91 44 2000 0006", available_beds=22,
                    ),
                ]
                db.add_all(seed_hospitals)
                db.commit()
                logger.info("Seeded default hospitals (Chennai / Tiruvallur area)")

            # Seed initial users if table is empty
            user_count = db.query(models.User).count()
            if user_count == 0:
                h = db.query(models.Hospital).first()
                admin_user = models.User(
                    email="admin@emergency.com",
                    name="System Admin",
                    password_hash=get_password_hash("admin123"),
                    role="admin",
                    is_active=1,
                )
                hospital_user = models.User(
                    email="hospital@apollo.com",
                    name="Apollo Dispatch Staff",
                    password_hash=get_password_hash("hospital123"),
                    role="hospital",
                    hospital_id=h.id if h else None,
                    is_active=1,
                )
                citizen_user = models.User(
                    email="user@emergency.com",
                    name="John Citizen",
                    password_hash=get_password_hash("user123"),
                    role="user",
                    is_active=1,
                )
                db.add_all([admin_user, hospital_user, citizen_user])
                db.commit()
                logger.info("Seeded default demo accounts: admin@emergency.com, hospital@apollo.com, user@emergency.com")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Startup task / seeding failed: {e}")

    # Launch background loop
    loop_task = asyncio.create_task(_auto_complete_old_cases_loop())
    yield
    loop_task.cancel()


# Create the FastAPI app with lifespan
app = FastAPI(title="AI Medical Dispatch", lifespan=lifespan)

# Request logging middleware
class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            threshold = 25.0 if any(p in request.url.path for p in ["/llm-chat", "/triage"]) else 2.5
            if process_time > threshold:
                logger.warning(f"[WARN] Slow request: {request.method} {request.url.path} - {process_time:.3f}s")
            return response
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(f"[ERR] Error: {request.method} {request.url.path} - {str(e)} - {process_time:.3f}s")
            raise

app.add_middleware(RequestLoggingMiddleware)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-LLM-Response-Text"]
)

# Create DB tables
Base.metadata.create_all(bind=engine)

# Include Routers
app.include_router(auth.router)
app.include_router(hospital.router)
app.include_router(user_portal.router)
app.include_router(triage.router)
app.include_router(medicalchat.router)
app.include_router(maps.router, prefix="/maps", tags=["maps"])
app.include_router(vapi.router, tags=["vapi"])
app.include_router(admin.router)