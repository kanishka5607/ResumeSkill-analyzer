import pytest
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.services.skill_extractor import skill_extractor
from app.services.evidence_analyzer import evidence_analyzer
from app.services.matching_engine import matching_engine
from app.services.readiness_scorer import readiness_scorer
from app.services.proof_scorer import proof_scorer
from app.services.gap_analyzer import gap_analyzer
from app.services.simulator_service import simulator_service

def test_password_hashing():
    pwd = "SecurePassword@123"
    hashed = hash_password(pwd)
    assert hashed != pwd
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False

def test_jwt_token_flow():
    payload = {"sub": 42, "email": "test@example.com", "role": "candidate"}
    token = create_access_token(payload)
    assert isinstance(token, str)
    decoded = decode_access_token(token)
    assert decoded["sub"] == "42"
    assert decoded["email"] == "test@example.com"
    assert decoded["role"] == "candidate"

def test_skill_extraction_and_alias_normalization():
    text = "Developed a responsive web portal using React, JS, and postgre sql. Also used Docker for containerization."
    skills = skill_extractor.extract_from_text(text)
    names = {s["canonical_name"] for s in skills}
    
    assert "React" in names
    assert "JavaScript" in names  # Normalized from 'JS'
    assert "PostgreSQL" in names  # Normalized from 'postgre sql'
    assert "Docker" in names
    
    # Check that Java is not false-positively extracted from JavaScript
    assert "Java" not in names

def test_evidence_analyzer_scoring():
    skill_data_project = {
        "canonical_name": "Python",
        "category": "Programming Languages",
        "original_text": "Python",
        "section_name": "Projects",
        "extraction_confidence": 0.95,
        "occurrences": [{
            "section": "Projects",
            "sentence": "Developed an automated student attendance tracking application using Python and SQLite, reducing manual verification time by 40%."
        }],
        "all_sections": {"Projects"}
    }
    result = evidence_analyzer.analyze_skill_evidence(skill_data_project)
    
    assert result["evidence_classification"] == "Evidence-Backed Skill"
    assert result["evidence_confidence"] >= 65.0
    assert len(result["evidence_records"]) == 1
    assert result["evidence_records"][0]["evidence_type"] == "Project"

def test_claimed_skill_classification():
    skill_data_claimed = {
        "canonical_name": "Kubernetes",
        "category": "Tools and Platforms",
        "original_text": "Kubernetes",
        "section_name": "Skills",
        "extraction_confidence": 0.95,
        "occurrences": [{
            "section": "Skills",
            "sentence": "Tools: Git, Docker, Kubernetes"
        }],
        "all_sections": {"Skills"}
    }
    result = evidence_analyzer.analyze_skill_evidence(skill_data_claimed)
    
    assert result["evidence_classification"] == "Claimed Skill"
    assert result["evidence_confidence"] < 25.0

def test_matching_engine_and_readiness_score():
    candidate_skills = [
        {
            "canonical_name": "Python",
            "category": "Programming Languages",
            "evidence_classification": "Evidence-Backed Skill",
            "evidence_confidence": 80.0,
            "supporting_sentences": ["Built data pipeline in Python"]
        },
        {
            "canonical_name": "SQL",
            "category": "Database",
            "evidence_classification": "Claimed Skill",
            "evidence_confidence": 15.0,
            "supporting_sentences": []
        }
    ]
    
    requirements = [
        {"canonical_name": "Python", "category": "Programming Languages", "requirement_type": "Required", "importance_weight": 2.0},
        {"canonical_name": "SQL", "category": "Database", "requirement_type": "Required", "importance_weight": 2.0},
        {"canonical_name": "Docker", "category": "Tools and Platforms", "requirement_type": "Preferred", "importance_weight": 1.0}
    ]
    
    matches = matching_engine.match_candidate_against_requirements(candidate_skills, requirements)
    status_map = {m["canonical_name"]: m["candidate_status"] for m in matches}
    
    assert status_map["Python"] == "Strong Match"
    assert status_map["SQL"] == "Claimed Match"
    assert status_map["Docker"] == "Missing Skill"
    
    readiness = readiness_scorer.calculate_readiness_score(matches)
    # Expected weighted score:
    # Python (Strong: 1.0 * 2.0 = 2.0)
    # SQL (Claimed: 0.3 * 2.0 = 0.6)
    # Docker (Missing: 0.0 * 1.0 = 0.0)
    # Total points = 2.6, Total weight = 5.0 -> 2.6 / 5.0 * 100 = 52.0%
    assert readiness["overall_score"] == 52.0
    assert readiness["strong_matches_count"] == 1
    assert readiness["claimed_matches_count"] == 1
    assert readiness["missing_count"] == 1

def test_skill_proof_score():
    skills = [
        {"canonical_name": "Python", "evidence_classification": "Evidence-Backed Skill", "evidence_confidence": 75.0},
        {"canonical_name": "SQLite", "evidence_classification": "Evidence-Backed Skill", "evidence_confidence": 70.0},
        {"canonical_name": "HTML", "evidence_classification": "Claimed Skill", "evidence_confidence": 10.0},
        {"canonical_name": "CSS", "evidence_classification": "Claimed Skill", "evidence_confidence": 10.0}
    ]
    # Proof score: (1.0 + 1.0 + 0.3 + 0.3) / 4 * 100 = 2.6 / 4 * 100 = 65.0%
    res = proof_scorer.calculate_skill_proof_score(skills)
    assert res["skill_proof_score"] == 65.0
    assert res["total_claimed_skills"] == 4
    assert res["backed_skills_count"] == 2

def test_gap_prioritization():
    matches = [
        {"canonical_name": "SQL", "requirement_type": "Required", "candidate_status": "Missing Skill", "evidence_confidence": 0.0},
        {"canonical_name": "Git", "requirement_type": "Preferred", "candidate_status": "Missing Skill", "evidence_confidence": 0.0},
        {"canonical_name": "Python", "requirement_type": "Required", "candidate_status": "Strong Match", "evidence_confidence": 85.0},
        {"canonical_name": "FastAPI", "requirement_type": "Required", "candidate_status": "Claimed Match", "evidence_confidence": 15.0}
    ]
    gaps = gap_analyzer.analyze_gaps(matches)
    gap_priorities = {g["canonical_name"]: g["gap_priority"] for g in gaps}
    
    assert gap_priorities["SQL"] == "Critical"  # Missing Required
    assert gap_priorities["FastAPI"] == "High"   # Claimed Required
    assert gap_priorities["Git"] == "Medium"    # Missing Preferred
    assert "Python" not in gap_priorities       # Strong Match is not a gap
