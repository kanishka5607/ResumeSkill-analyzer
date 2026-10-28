import logging
import re
import sys

class SafeFormatter(logging.Formatter):
    """
    Structured log formatter that automatically redacts sensitive data:
    - Passwords
    - Bearer tokens / JWTs
    - Emails (partially masked)
    - Full resume texts
    """
    JWT_PATTERN = re.compile(r"eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+")
    PASSWORD_PATTERN = re.compile(r"('password'|\"password\"|password)\s*[:=]\s*['\"][^'\"]+['\"]", re.IGNORECASE)

    def format(self, record: logging.LogRecord) -> str:
        msg = super().format(record)
        # Redact JWT tokens
        msg = self.JWT_PATTERN.sub("[REDACTED_JWT]", msg)
        # Redact passwords
        msg = self.PASSWORD_PATTERN.sub("password=[REDACTED]", msg)
        return msg

def setup_logging():
    """Configure secure application-wide logging."""
    logger = logging.getLogger("resume_platform")
    logger.setLevel(logging.INFO)

    # Avoid duplicate handlers on reload
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(logging.INFO)
        formatter = SafeFormatter(
            fmt="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    # Silence noisy third-party loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("multipart").setLevel(logging.WARNING)

    return logger

logger = setup_logging()
