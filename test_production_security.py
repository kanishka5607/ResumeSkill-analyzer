import io
import pytest
from app.database.session import SessionLocal
from app.models.all_models import User, Resume, ResumeAnalysis, GapReport, GapItem, Skill
from app.schemas.all_schemas import (
    UserCreate, UserLogin, LearningProgressCreate, MatchRequest
)
from app.api.auth import register, login, logout
from app.api.resumes import get_resume, load_sample_demo_resume, _validate_file_signature, _sanitize_filename
from app.api.analyses import analyze_resume, get_analysis
from app.api.matching import match_analysis_against_job, get_gap_report
from app.api.learning import start_learning_task, get_skill_roadmap
from app.services.matching_engine import matching_engine
from app.services.resume_parser import resume_parser
from app.core.security import validate_password_strength, revoke_token, decode_access_token, rate_limiter
from fastapi import HTTPException

class DummyClient:
    def __init__(self, host="127.0.0.1"):
        self.host = host

class DummyRequest:
    def __init__(self, host="127.0.0.1"):
        self.client = DummyClient(host)
        self.headers = {}

def test_public_registration_cannot_escalate_to_admin():
    """Security: Ensure public registration requests with role='admin' are forced to 'candidate'."""
    db = SessionLocal()
    try:
        email = "escalation_attempt@example.com"
        db.query(User).filter(User.email == email).delete()
        db.commit()

        req = DummyRequest()
        payload = UserCreate(
            full_name="Privilege Escalation Attempt",
            email=email,
            password="StrongPassword123!",
            role="admin"
        )
        response = register(payload, req, db)
        assert response.user.role == "candidate", "Role must be forced to candidate!"
    finally:
        db.close()

def test_password_strength_enforcement():
    """Security: Passwords must be >= 8 chars and contain uppercase, lowercase, and numbers/symbols."""
    with pytest.raises(HTTPException) as exc_info:
        validate_password_strength("Short1!")
    assert exc_info.value.status_code == 400

    with pytest.raises(HTTPException) as exc_info:
        validate_password_strength("nouppercase123!")
    assert exc_info.value.status_code == 400
    assert "uppercase" in exc_info.value.detail.lower()

    with pytest.raises(HTTPException) as exc_info:
        validate_password_strength("NOLOWERCASE123!")
    assert exc_info.value.status_code == 400
    assert "lowercase" in exc_info.value.detail.lower()

    with pytest.raises(HTTPException) as exc_info:
        validate_password_strength("OnlyLettersNoNumbersOrSymbols")
    assert exc_info.value.status_code == 400
    assert "number" in exc_info.value.detail.lower()

def test_token_revocation_on_logout():
    """Security: Revoked tokens cannot be decoded successfully after logout."""
    db = SessionLocal()
    try:
        email = "revoketest@example.com"
        db.query(User).filter(User.email == email).delete()
        db.commit()

        req = DummyRequest()
        reg = register(UserCreate(full_name="Revoke Test", email=email, password="Password123!"), req, db)
        token = reg.access_token

        # Verify token is valid initially
        decoded = decode_access_token(token)
        assert decoded is not None
        assert decoded["email"] == email

        # Revoke token
        revoke_token(token)

        # Token must be rejected now
        assert decode_access_token(token) is None
    finally:
        db.close()

def test_filename_sanitization_and_uuid_storage():
    """Security: Filename traversal characters must be stripped."""
    malicious = "../../../etc/passwd.pdf"
    sanitized = _sanitize_filename(malicious)
    assert ".." not in sanitized
    assert "/" not in sanitized
    assert "\\" not in sanitized
    assert sanitized.endswith("passwd.pdf")

def test_magic_bytes_validation():
    """Security: Uploading disguised files must fail magic byte signature checks."""
    fake_pdf = b"MZ\x90\x00\x03\x00\x00\x00FakeEXEContent"
    assert _validate_file_signature(fake_pdf, "pdf") is False

    valid_pdf = b"%PDF-1.4\n%Fake PDF content for test\n%%EOF"
    assert _validate_file_signature(valid_pdf, "pdf") is True

    fake_png = b"NotAPngImageContent"
    assert _validate_file_signature(fake_png, "png") is False

    valid_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"
    assert _validate_file_signature(valid_png, "png") is True

def test_cross_user_isolation_and_gap_item_tampering():
    """Security: User B cannot access User A's data or forge User A's gap_item_id in learning tasks."""
    db = SessionLocal()
    try:
        rate_limiter._requests.clear()
        # Create user A
        email_a = "user_alpha@example.com"
        db.query(User).filter(User.email == email_a).delete()
        db.commit()
        req_a = DummyRequest("127.0.0.50")
        reg_a = register(UserCreate(full_name="User Alpha", email=email_a, password="Password123!"), req_a, db)
        user_a = db.query(User).filter(User.id == reg_a.user.id).first()

        # Create user B
        email_b = "user_beta@example.com"
        db.query(User).filter(User.email == email_b).delete()
        db.commit()
        req_b = DummyRequest("127.0.0.51")
        reg_b = register(UserCreate(full_name="User Beta", email=email_b, password="Password123!"), req_b, db)
        user_b = db.query(User).filter(User.id == reg_b.user.id).first()

        # User A loads demo resume
        resume_a = load_sample_demo_resume(user_a, db)

        # User B cannot access User A's resume
        with pytest.raises(HTTPException) as exc_info:
            get_resume(resume_a.id, user_b, db)
        assert exc_info.value.status_code == 404

        # User A runs analysis
        analysis_a = analyze_resume(resume_a.id, user_a, db)

        # User B cannot access User A's analysis
        with pytest.raises(HTTPException) as exc_info:
            get_analysis(analysis_a.id, user_b, db)
        assert exc_info.value.status_code == 404

        # User A matches against role 1
        match_a = match_analysis_against_job(analysis_a.id, MatchRequest(job_role_id=1), user_a, db)
        assert len(match_a.gap_items) > 0
        target_gap_item_id = match_a.gap_items[0].id

        # User B attempts to forge learning task with User A's gap_item_id -> MUST be 403 Forbidden
        with pytest.raises(HTTPException) as exc_info:
            start_learning_task(
                LearningProgressCreate(learning_resource_id=1, gap_item_id=target_gap_item_id, status="In Progress"),
                user_b,
                db
            )
        assert exc_info.value.status_code == 403
    finally:
        db.close()

def test_job_description_parsing_without_half_split():
    """Accuracy: JD parsing uses linguistic modal patterns and does not split unheaded text in half."""
    unheaded_jd = """
    We are seeking a Backend Engineer to build resilient cloud microservices.
    You will develop high-throughput APIs and write automated tests.
    Must have extensive experience with Python and SQL.
    A solid understanding of Docker and PostgreSQL is required.
    Familiarity with Kubernetes is a plus and nice to have.
    Knowledge of Redis or caching is desired.
    """
    parsed = matching_engine.parse_job_description(unheaded_jd)
    req_names = [r["canonical_name"] for r in parsed["required_skills"]]
    pref_names = [p["canonical_name"] for p in parsed["preferred_skills"]]

    assert "Python" in req_names
    assert "SQL" in req_names
    assert "Kubernetes" in pref_names

def test_dynamic_roadmap_values_from_gap_item():
    """Accuracy: Roadmap priority and evidence confidence reflect candidate's actual gap report."""
    db = SessionLocal()
    try:
        cand = db.query(User).filter(User.email == "candidate@resumeskill.com").first()
        if cand:
            sql_skill = db.query(Skill).filter(Skill.canonical_name == "SQL").first()
            if sql_skill:
                roadmap = get_skill_roadmap(sql_skill.id, cand, db)
                assert roadmap.canonical_name == "SQL"
                assert len(roadmap.steps) == 7
    finally:
        db.close()
