from sqlalchemy import TIMESTAMP, Column, Integer, String, Enum, ForeignKey, Text, func, DECIMAL
from sqlalchemy.orm import relationship
from .database import Base

class Hospital(Base):
    __tablename__ = "hospitals"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    address = Column(String(500), nullable=True)
    latitude = Column(DECIMAL(9, 6), nullable=True)
    longitude = Column(DECIMAL(9, 6), nullable=True)
    contact = Column(String(20), nullable=True)
    available_beds = Column(Integer, default=10)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    users = relationship("User", back_populates="hospital")
    cases = relationship("Case", back_populates="hospital")
    ambulances = relationship("Ambulance", back_populates="hospital")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(Enum("admin", "hospital", "user"), default="user", nullable=False)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    is_active = Column(Integer, default=1)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    hospital = relationship("Hospital", back_populates="users")
    cases = relationship("Case", back_populates="user")

class Patient(Base):
    __tablename__ = "patients"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    age = Column(Integer)
    gender = Column(Enum("M","F"))
    contact = Column(String(20))
    patient_triage = Column(Enum("Red","Orange","Yellow"))
    ambulance_type = Column(Enum("Basic","Advanced","ICU"))
    patient_status = Column(Enum("Pending","Admitted","Travelling"), default="Pending")
    # Relationship to the cases table
    cases = relationship("Case", back_populates="patient")

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    triage_level = Column(Enum("Emergency","Transport","Clinical"))
    symptoms = Column(Text)
    location = Column(String(255))
    latitude = Column(DECIMAL(9, 6), nullable=True)
    longitude = Column(DECIMAL(9, 6), nullable=True)
    status = Column(Enum("Pending","Assigned","Completed"), default="Pending")
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

    # Relationships
    patient = relationship("Patient", back_populates="cases")
    hospital = relationship("Hospital", back_populates="cases")
    user = relationship("User", back_populates="cases")

class Ambulance(Base):
    __tablename__ = "ambulances"
    ambulance_id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id"), nullable=True)
    type_of_ambulance = Column(Enum("Basic", "Advanced", "ICU"))
    vehicle_number = Column(String(255), unique=True)
    no_of_staffs = Column(Integer)
    current_location = Column(String(255))  # Address description
    latitude = Column(DECIMAL(9, 6), nullable=True)  # For Google Maps coordinates
    longitude = Column(DECIMAL(9, 6), nullable=True)  # For Google Maps coordinates
    status = Column(Enum("available", "dispatch", "out_of_services", "maintenance"), default="available")
    fuel_level = Column(Integer)
    last_updated = Column(TIMESTAMP(timezone=True), default=func.now())

    # Relationships
    staffs = relationship("Staff", back_populates="ambulance")
    hospital = relationship("Hospital", back_populates="ambulances")

class Staff(Base):
    __tablename__ = "staffs"
    staff_id = Column(Integer, primary_key=True, index=True)
    ambulance_id = Column(Integer, ForeignKey("ambulances.ambulance_id"))
    role = Column(String(255))
    staff_status = Column(Enum("available", "on_call", "busy", "on_leave"), default="available")
    # Relationship back to the ambulance table
    ambulance = relationship("Ambulance", back_populates="staffs")

class SystemPrompt(Base):
    __tablename__ = "system_prompts"
    id = Column(Integer, primary_key=True, index=True)
    prompt = Column(Text, nullable=False)
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())
