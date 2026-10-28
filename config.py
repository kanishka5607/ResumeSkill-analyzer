import os
import secrets
from pathlib import Path
from typing import List, Set
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()

# Persistent Data and Storage Configuration
DATA_DIR = Path(os.getenv("DATA_DIR", str(BASE_DIR / "data")))
DATA_DIR.mkdir(parents=True, exist_ok=True)

STORAGE_DIR = Path(os.getenv("STORAGE_DIR", str(BASE_DIR.parent / "storage" / "resumes")))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

def _resolve_secret_key() -> str:
    """
    Read SECRET_KEY strictly from environment.
    Fails startup in production / non-development environments if absent.
    In development, falls back to a generated local ephemeral key or explicit local secret.
    """
    secret = os.getenv("SECRET_KEY")
    if not secret:
        if ENVIRONMENT in ["production", "staging"]:
            raise RuntimeError(
                "CRITICAL SECURITY CONFIGURATION ERROR: 'SECRET_KEY' environment variable "
                f"must be explicitly set in {ENVIRONMENT} environment. Server startup aborted."
            )
        # Development fallback with clear warning
        import warnings
        warnings.warn(
            "SECURITY NOTICE: No 'SECRET_KEY' environment variable provided. "
            "Using an ephemeral development secret. Set SECRET_KEY in your .env file for persistent sessions.",
            UserWarning
        )
        return "dev-insecure-secret-key-change-in-production-min32bytes-2026!"
    if len(secret) < 32 and ENVIRONMENT in ["production", "staging"]:
        raise RuntimeError("CRITICAL SECURITY ERROR: 'SECRET_KEY' must be at least 32 characters in production.")
    return secret

def _resolve_cors_origins() -> List[str]:
    """Parse comma-separated CORS origins from environment, with safe defaults."""
    env_origins = os.getenv("CORS_ORIGINS", "")
    if env_origins.strip():
        return [origin.strip() for origin in env_origins.split(",") if origin.strip()]
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

def _resolve_database_url() -> str:
    """Resolve database URL; defaults to persistent SQLite inside DATA_DIR."""
    db_env = os.getenv("DATABASE_URL")
    if db_env:
        return db_env
    default_sqlite_path = DATA_DIR / "platform.db"
    return f"sqlite:///{default_sqlite_path.as_posix()}"

class Settings(BaseModel):
    PROJECT_NAME: str = "Resume Skill Evidence Extraction & Gap Analysis Platform"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    ENVIRONMENT: str = ENVIRONMENT
    
    # Security & Tokens
    SECRET_KEY: str = _resolve_secret_key()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))  # 24 hours
    
    # Rate Limiting
    RATE_LIMIT_LOGIN_PER_MIN: int = int(os.getenv("RATE_LIMIT_LOGIN_PER_MIN", "5"))
    RATE_LIMIT_REGISTER_PER_MIN: int = int(os.getenv("RATE_LIMIT_REGISTER_PER_MIN", "3"))
    
    # Database
    DATABASE_URL: str = _resolve_database_url()
    
    # Storage & Upload Limits
    UPLOAD_DIR: Path = STORAGE_DIR
    MAX_FILE_SIZE_MB: int = int(os.getenv("MAX_FILE_SIZE_MB", "15"))
    MAX_PDF_PAGES: int = int(os.getenv("MAX_PDF_PAGES", "15"))
    ALLOWED_EXTENSIONS: Set[str] = {"pdf", "docx", "png", "jpg", "jpeg", "webp", "bmp"}
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = _resolve_cors_origins()
    
    # Seeding (Demo accounts only in development mode)
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "true" if ENVIRONMENT == "development" else "false").lower() == "true"
    SEED_ADMIN_EMAIL: str = os.getenv("SEED_ADMIN_EMAIL", "skanishka5607@gmail.com" if ENVIRONMENT == "development" else "")
    SEED_ADMIN_PASSWORD: str = os.getenv("SEED_ADMIN_PASSWORD", "Admin@123456" if ENVIRONMENT == "development" else "")

settings = Settings()
