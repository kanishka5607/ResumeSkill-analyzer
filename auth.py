from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import User, AuditEvent
from app.schemas.all_schemas import UserCreate, UserLogin, UserResponse, TokenResponse
from app.core.security import (
    hash_password, verify_password, create_access_token,
    security_bearer, decode_access_token,
    validate_password_strength, rate_limiter, get_client_ip,
    revoke_token,
)
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["Authentication"])

def get_current_user(
    credentials = Depends(security_bearer),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to retrieve the authenticated user from JWT token."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token missing or invalid",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload["sub"]
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Dependency ensuring user has admin privileges."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this operation"
        )
    return current_user

@router.post("/register", response_model=TokenResponse)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    """Register a new candidate account. All public registrations are forced to role='candidate'."""
    # Rate limiting on registration
    client_ip = get_client_ip(request)
    allowed, retry_after = rate_limiter.check(
        f"register:{client_ip}",
        max_requests=settings.RATE_LIMIT_REGISTER_PER_MIN,
        window_seconds=60
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many registration attempts. Please retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

    # Enforce password strength
    validate_password_strength(user_in.password)

    existing = db.query(User).filter(User.email == user_in.email.lower().strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # SECURITY: Always force role to "candidate" — admin accounts are never
    # created through the public registration endpoint, regardless of the
    # role value sent by the client.
    user = User(
        full_name=user_in.full_name.strip(),
        email=user_in.email.lower().strip(),
        password_hash=hash_password(user_in.password),
        role="candidate"
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Record audit event
    audit = AuditEvent(
        user_id=user.id,
        event_type="USER_REGISTERED",
        resource_type="User",
        resource_id=user.id
    )
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, request: Request, db: Session = Depends(get_db)):
    """Authenticate with email and password."""
    # Rate limiting on login
    client_ip = get_client_ip(request)
    allowed, retry_after = rate_limiter.check(
        f"login:{client_ip}",
        max_requests=settings.RATE_LIMIT_LOGIN_PER_MIN,
        window_seconds=60
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many login attempts. Please retry after {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)}
        )

    user = db.query(User).filter(User.email == login_in.email.lower().strip()).first()
    if not user or not verify_password(login_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials."
        )

    # Record audit event
    audit = AuditEvent(
        user_id=user.id,
        event_type="USER_LOGIN",
        resource_type="User",
        resource_id=user.id
    )
    db.add(audit)
    db.commit()

    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role})
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.post("/logout")
def logout(
    credentials = Depends(security_bearer),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """User logout with token revocation."""
    # Revoke the token immediately so it cannot be reused
    if credentials and credentials.credentials:
        revoke_token(credentials.credentials)

    audit = AuditEvent(
        user_id=current_user.id,
        event_type="USER_LOGOUT",
        resource_type="User",
        resource_id=current_user.id
    )
    db.add(audit)
    db.commit()
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get profile of current authenticated user."""
    return UserResponse.model_validate(current_user)
