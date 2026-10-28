import re
import time
import threading
import bcrypt
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Set, Tuple
from fastapi import HTTPException, Security, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)

# ----------------- In-Memory Token Revocation Store -----------------
class TokenRevocationStore:
    """Thread-safe store for revoked JWT tokens (logged-out sessions)."""
    def __init__(self):
        self._revoked: Dict[str, float] = {}  # token -> expiry_timestamp
        self._lock = threading.Lock()

    def revoke(self, token: str, expiry_timestamp: float) -> None:
        with self._lock:
            self._cleanup_expired()
            self._revoked[token] = expiry_timestamp

    def is_revoked(self, token: str) -> bool:
        with self._lock:
            return token in self._revoked

    def _cleanup_expired(self) -> None:
        now = time.time()
        expired = [t for t, exp in self._revoked.items() if exp < now]
        for t in expired:
            del self._revoked[t]

token_revocation_store = TokenRevocationStore()

# ----------------- Rate Limiting -----------------
class InMemoryRateLimiter:
    """Sliding-window in-memory rate limiter per client IP."""
    def __init__(self):
        self._requests: Dict[str, list] = {}  # key -> list of timestamps
        self._lock = threading.Lock()

    def check(self, key: str, max_requests: int, window_seconds: int = 60) -> Tuple[bool, int]:
        """
        Check if request is allowed.
        Returns (is_allowed, seconds_to_wait).
        """
        now = time.time()
        with self._lock:
            timestamps = self._requests.get(key, [])
            # Filter timestamps within current sliding window
            valid_timestamps = [t for t in timestamps if now - t < window_seconds]
            if len(valid_timestamps) >= max_requests:
                earliest = valid_timestamps[0]
                retry_after = int(window_seconds - (now - earliest)) + 1
                self._requests[key] = valid_timestamps
                return False, max(1, retry_after)
            
            valid_timestamps.append(now)
            self._requests[key] = valid_timestamps
            return True, 0

rate_limiter = InMemoryRateLimiter()

def get_client_ip(request: Request) -> str:
    """Safely determine client IP address from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"

# ----------------- Password Hashing & Strength -----------------
def hash_password(password: str) -> str:
    """Hash password using bcrypt with salt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def validate_password_strength(password: str) -> None:
    """
    Validate that password meets production security criteria:
    - Minimum 8 characters, maximum 128
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit or special symbol
    """
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long."
        )
    if len(password) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password cannot exceed 128 characters."
        )
    if not re.search(r"[A-Z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter (A-Z)."
        )
    if not re.search(r"[a-z]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one lowercase letter (a-z)."
        )
    if not re.search(r"[0-9\W_]", password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one number (0-9) or special symbol."
        )

# ----------------- JWT Access Token Handling -----------------
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate JWT access token with expiration."""
    to_encode = data.copy()
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now,
        "iss": "resume-skill-platform"
    })
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decode and validate JWT access token, verifying signature and revocation."""
    if token_revocation_store.is_revoked(token):
        return None
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub"]}
        )
        return payload
    except jwt.PyJWTError:
        return None

def revoke_token(token: str) -> None:
    """Revoke token immediately upon logout."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
        exp = payload.get("exp", time.time() + settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
        token_revocation_store.revoke(token, float(exp))
    except Exception:
        token_revocation_store.revoke(token, time.time() + 86400)
