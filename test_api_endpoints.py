import pytest
from app.database.session import SessionLocal
from app.models.all_models import User, Resume
from app.api.auth import register, login, get_me
from app.api.jobs import list_job_roles, get_job_role
from app.api.resumes import list_resumes, get_resume
from app.schemas.all_schemas import UserCreate, UserLogin
from fastapi import HTTPException

class DummyClient:
    host = "127.0.0.1"

class DummyRequest:
    client = DummyClient()
    headers = {}

def test_health_check_api():
    from app.main import health_check
    res = health_check()
    assert res["status"] == "online"
    assert "Resume Skill Evidence" in res["service"]

def test_list_job_roles_public():
    db = SessionLocal()
    try:
        roles = list_job_roles(db)
        assert len(roles) >= 5
        titles = [r.title for r in roles]
        assert "Junior Data Analyst" in titles
        assert "Full-Stack Developer" in titles
    finally:
        db.close()

def test_auth_registration_and_login():
    db = SessionLocal()
    try:
        email = "endpoint_test_user@example.com"
        pwd = "TestPassword@123"
        req = DummyRequest()

        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            reg_res = register(UserCreate(full_name="Endpoint Tester", email=email, password=pwd), req, db)
            assert reg_res.user.email == email
            assert reg_res.user.role == "candidate"

        login_res = login(UserLogin(email=email, password=pwd), req, db)
        assert login_res.access_token is not None
        assert login_res.user.email == email
    finally:
        db.close()

def test_user_isolation_security():
    db = SessionLocal()
    try:
        cand1 = db.query(User).filter(User.email == "candidate@resumeskill.com").first()
        admin = db.query(User).filter(User.email == "skanishka5607@gmail.com").first()

        if cand1 and admin:
            resumes = list_resumes(cand1, db)
            if resumes:
                target_resume_id = resumes[0].id
                # Cand1 can access their own resume
                own = get_resume(target_resume_id, cand1, db)
                assert own.id == target_resume_id

                # Admin or other user cannot access it through regular candidate endpoint
                with pytest.raises(HTTPException) as exc_info:
                    get_resume(target_resume_id, admin, db)
                assert exc_info.value.status_code == 404
    finally:
        db.close()
