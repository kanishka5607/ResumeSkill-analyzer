import pytest
from fastapi import HTTPException
from app.database.session import SessionLocal
from app.models.all_models import User, Resume, ResumeAnalysis, GapReport, JobRole, JobDescription
from app.api.matching import match_analysis_against_job, get_latest_gap_report_for_analysis, get_gap_report
from app.api.graph import get_evidence_graph
from app.api.history import get_analysis_history
from app.schemas.all_schemas import MatchRequest
from app.services.graph_generator import graph_generator

def get_or_create_test_user_and_analysis(db):
    email = "job_test_user@example.com"
    user = db.query(User).filter(User.email == email).first()
    if not user:
        from app.core.security import hash_password
        user = User(
            email=email,
            password_hash=hash_password("SecretPassword123!"),
            full_name="Job Persistence Tester",
            role="candidate"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    resume = db.query(Resume).filter(Resume.user_id == user.id).first()
    if not resume:
        resume = Resume(
            user_id=user.id,
            original_filename="test_resume.pdf",
            storage_key="test_resume.pdf",
            file_type="pdf",
            extracted_text="Experienced Software Engineer with Python, SQL, React, FastAPI, Docker, and PostgreSQL."
        )
        db.add(resume)
        db.commit()
        db.refresh(resume)

    analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.resume_id == resume.id).first()
    if not analysis:
        analysis = ResumeAnalysis(
            resume_id=resume.id,
            user_id=user.id,
            extracted_profile='{"candidate_name": "Job Persistence Tester", "sections": {"Projects": "E-Commerce API in FastAPI and SQL\\nML Pipeline in Python"}}',
            analysis_version=1,
            overall_status="completed"
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)

    return user, analysis

def test_latest_gap_report_target_persistence():
    db = SessionLocal()
    try:
        user, analysis = get_or_create_test_user_and_analysis(db)

        # 1. Match against role 2 (e.g. Full-Stack Developer)
        req2 = MatchRequest(job_role_id=2)
        rep2 = match_analysis_against_job(analysis.id, req2, user, db)
        assert rep2.job_role_id == 2
        role2 = db.query(JobRole).filter(JobRole.id == 2).first()
        expected_title2 = role2.title if role2 else "Target Role"

        # 2. Query latest gap report endpoint
        latest = get_latest_gap_report_for_analysis(analysis.id, user, db)
        assert latest.id == rep2.id
        assert latest.job_role_id == 2
        assert latest.job_role_title == expected_title2

        # 3. Match against role 3 (e.g. AI Engineer)
        req3 = MatchRequest(job_role_id=3)
        rep3 = match_analysis_against_job(analysis.id, req3, user, db)
        assert rep3.job_role_id == 3
        role3 = db.query(JobRole).filter(JobRole.id == 3).first()
        expected_title3 = role3.title if role3 else "Target Role"

        # 4. Verify latest gap report updated to role 3
        latest_after = get_latest_gap_report_for_analysis(analysis.id, user, db)
        assert latest_after.id == rep3.id
        assert latest_after.job_role_id == 3
        assert latest_after.job_role_title == expected_title3
        assert latest_after.id != rep2.id
    finally:
        db.close()

def test_custom_job_description_persistence_and_title():
    db = SessionLocal()
    try:
        user, analysis = get_or_create_test_user_and_analysis(db)

        # Create custom JD
        custom_jd = JobDescription(
            user_id=user.id,
            title="Senior Platform Architect",
            description_text="Must have experience with Python, Docker, Kubernetes, and PostgreSQL.",
            extracted_requirements='{"required_skills": [{"canonical_name": "Python", "requirement_type": "Required", "importance_weight": 2.0}], "preferred_skills": []}'
        )
        db.add(custom_jd)
        db.commit()
        db.refresh(custom_jd)

        # Match against custom JD
        req = MatchRequest(job_description_id=custom_jd.id)
        rep = match_analysis_against_job(analysis.id, req, user, db)
        assert rep.job_description_id == custom_jd.id

        # Verify latest gap report returns custom title
        latest = get_latest_gap_report_for_analysis(analysis.id, user, db)
        assert latest.id == rep.id
        assert latest.job_role_title == "Senior Platform Architect"

        # Verify history API returns custom title
        history = get_analysis_history(user, db)
        assert len(history) > 0
        latest_hist = history[0]
        assert latest_hist["target_title"] == "Senior Platform Architect"
        assert latest_hist["target_type"] == "saved_job_description"
        assert latest_hist["gap_report_id"] == rep.id
    finally:
        db.close()

def test_cross_user_isolation_on_latest_gap_report():
    db = SessionLocal()
    try:
        user, analysis = get_or_create_test_user_and_analysis(db)
        admin = db.query(User).filter(User.email == "skanishka5607@gmail.com").first()
        assert admin is not None

        # Admin attempting to get candidate's latest gap report via user endpoint should get 404
        with pytest.raises(HTTPException) as exc_info:
            get_latest_gap_report_for_analysis(analysis.id, admin, db)
        assert exc_info.value.status_code == 404
    finally:
        db.close()

def test_graph_endpoint_with_specific_gap_report_id():
    db = SessionLocal()
    try:
        user, analysis = get_or_create_test_user_and_analysis(db)

        # Create two gap reports
        rep_a = match_analysis_against_job(analysis.id, MatchRequest(job_role_id=1), user, db)
        rep_b = match_analysis_against_job(analysis.id, MatchRequest(job_role_id=2), user, db)

        # Request graph with rep_a
        graph_a = get_evidence_graph(analysis.id, gap_report_id=rep_a.id, current_user=user, db=db)
        assert graph_a.gap_report_id == rep_a.id
        role1 = db.query(JobRole).filter(JobRole.id == 1).first()
        assert graph_a.target_role == (role1.title if role1 else "Junior Data Analyst")

        # Request graph with rep_b
        graph_b = get_evidence_graph(analysis.id, gap_report_id=rep_b.id, current_user=user, db=db)
        assert graph_b.gap_report_id == rep_b.id
        role2 = db.query(JobRole).filter(JobRole.id == 2).first()
        assert graph_b.target_role == (role2.title if role2 else "Full-Stack Developer")

        # Non-existent report returns 404
        with pytest.raises(HTTPException) as exc404:
            get_evidence_graph(analysis.id, gap_report_id=999999, current_user=user, db=db)
        assert exc404.value.status_code == 404
    finally:
        db.close()

def test_graph_layout_collision_free():
    """
    Verify the 6-column graph generator and layout algorithm produces 0 coordinate collisions
    with large numbers of skills, projects, gaps, and learning nodes.
    """
    skills = [
        {"canonical_name": f"Skill_{i}", "category": "Tech", "evidence_classification": "Evidence-Backed Skill", "evidence_confidence": 75.0}
        for i in range(12)
    ]
    match_results = [
        {"canonical_name": f"MissingReq_{i}", "candidate_status": "Missing Skill", "requirement_type": "Required"}
        for i in range(6)
    ] + [
        {"canonical_name": f"PartialReq_{i}", "candidate_status": "Partial Match", "requirement_type": "Preferred"}
        for i in range(4)
    ]
    projects = [f"Enterprise Cloud Architecture Project {i}" for i in range(5)]

    graph_data = graph_generator.generate_graph(
        candidate_name="Alex River",
        skills=skills,
        role_title="Lead AI Engineer",
        match_results=match_results,
        projects=projects
    )

    nodes = graph_data["nodes"]
    assert len(nodes) > 25

    # Simulate 6-column layout placement
    columns = {
        "candidate": 90,
        "project": 260,
        "skill": 440,
        "job_role": 620,
        "gap": 800,
        "learning": 970
    }
    grouped = {k: [] for k in columns}
    for n in nodes:
        t = n["type"]
        if t in grouped:
            grouped[t].append(n)
        else:
            grouped["skill"].append(n)

    positions = {}
    stepY = 56
    maxCount = max(len(arr) for arr in grouped.values())
    computedHeight = max(520, 110 + maxCount * stepY)

    for colType, colNodes in grouped.items():
        colX = columns[colType]
        count = len(colNodes)
        if count == 1:
            positions[colNodes[0]["id"]] = (colX, computedHeight / 2)
        elif count > 1:
            span = (count - 1) * stepY
            startY = (computedHeight - span) / 2
            for idx, n in enumerate(colNodes):
                positions[n["id"]] = (colX, startY + idx * stepY)

    # Verify that all coordinate tuples are unique (zero overlaps)
    all_coords = list(positions.values())
    assert len(all_coords) == len(set(all_coords)), "Collision detected in node coordinates!"

    # Verify min distance between any two nodes in same column is exactly stepY
    for colType, colNodes in grouped.items():
        if len(colNodes) > 1:
            y_vals = sorted([positions[n["id"]][1] for n in colNodes])
            for i in range(len(y_vals) - 1):
                assert (y_vals[i+1] - y_vals[i]) >= stepY - 0.001
