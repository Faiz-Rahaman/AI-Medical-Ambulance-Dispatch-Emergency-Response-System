from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from .. import models, schemas
from ..auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _format_user_response(user: models.User, db: Session) -> schemas.UserResponse:
    hospital_name = None
    if user.hospital_id:
        h = db.query(models.Hospital).filter(models.Hospital.id == user.hospital_id).first()
        if h:
            hospital_name = h.name
    return schemas.UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        hospital_id=user.hospital_id,
        is_active=user.is_active,
        hospital_name=hospital_name,
    )


@router.post("/register", response_model=schemas.TokenResponse)
def register(user_in: schemas.UserRegister, db: Session = Depends(get_db)):
    # Normalize email
    email = user_in.email.strip().lower()

    # Check existing user
    existing_user = db.query(models.User).filter(models.User.email == email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    # Validate role
    role = user_in.role or "user"
    if role not in ["admin", "hospital", "user"]:
        role = "user"

    # Validate hospital if provided
    hospital_id = user_in.hospital_id
    if hospital_id:
        h = db.query(models.Hospital).filter(models.Hospital.id == hospital_id).first()
        if not h:
            hospital_id = None

    # Hash password and create user
    hashed_pwd = get_password_hash(user_in.password)
    user = models.User(
        email=email,
        name=user_in.name.strip(),
        password_hash=hashed_pwd,
        role=role,
        hospital_id=hospital_id,
        is_active=1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate token
    token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=_format_user_response(user, db),
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(login_in: schemas.UserLogin, db: Session = Depends(get_db)):
    email = login_in.email.strip().lower()
    user = db.query(models.User).filter(models.User.email == email).first()

    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Please contact an administrator.",
        )

    token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return schemas.TokenResponse(
        access_token=token,
        token_type="bearer",
        user=_format_user_response(user, db),
    )


@router.get("/me", response_model=schemas.UserResponse)
def get_me(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _format_user_response(current_user, db)


@router.put("/profile", response_model=schemas.UserResponse)
def update_profile(
    update_data: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if update_data.name is not None and update_data.name.strip():
        current_user.name = update_data.name.strip()
    if update_data.password is not None and len(update_data.password) >= 6:
        current_user.password_hash = get_password_hash(update_data.password)
    
    db.commit()
    db.refresh(current_user)
    return _format_user_response(current_user, db)
