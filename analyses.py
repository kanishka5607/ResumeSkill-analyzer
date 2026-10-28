import json
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import (
    Resume, ResumeAnalysis, ResumeSkill, SkillEvidence, Skill, User, AuditEvent
)
from app.schemas.all_schemas import (
    ResumeAnalysisResponse, ResumeSkillResponse, SkillEvidenceResponse
)
from app.api.auth import get_current_user
from app.services.resume_parser import resume_parser
from app.services.skill_extractor import skill_extractor
from app.services.evidence_analyzer import evidence_analyzer
from app.services.proof_scorer import proof_scorer

router = APIRouter(tags=["Analysis"])

@router.post("/resumes/{resume_id}/analyze", response_model=ResumeAnalysisResponse)
def analyze_resume(
    resume_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Run full NLP parsing, section segmentation, skill extraction,
    and evidence confidence scoring on an uploaded resume.
    """
    resume = db.query(Resume).filter(Resume.id == resume_id, Resume.user_id == current_user.id).first()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found or access denied.")

    raw_text = resume.extracted_text or ""
    if not raw_text.strip():
        raise HTTPException(status_code=400, detail="Cannot analyze resume: document text is empty.")

    # 1. Segment sections and parse contact info
    sections = resume_parser._segment_sections(raw_text)
    cand_name, email, phone = resume_parser._extract_contact_info(raw_text)

    # 2. Extract skills dynamically across sections
    extracted_skills = skill_extractor.extract_from_sections(sections)

    # 3. Analyze supporting evidence for each skill
    analyzed_skills = [evidence_analyzer.analyze_skill_evidence(s) for s in extracted_skills]

    # 4. Calculate Skill Proof Score
    proof_result = proof_scorer.calculate_skill_proof_score(analyzed_skills)

    # 5. Determine analysis version count
    previous_count = db.query(ResumeAnalysis).filter(ResumeAnalysis.resume_id == resume.id).count()
    analysis_version = previous_count + 1

    profile_json = {
        "candidate_name": cand_name or current_user.full_name,
        "email": email or current_user.email,
        "phone": phone,
        "sections": sections,
        "total_skills_found": len(analyzed_skills),
        "proof_score_meta": proof_result
    }

    # 6. Save ResumeAnalysis snapshot
    analysis = ResumeAnalysis(
        resume_id=resume.id,
        user_id=current_user.id,
        analysis_version=analysis_version,
        extracted_profile=json.dumps(profile_json),
        overall_status="completed"
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # 7. Persist resume skills & evidence records
    for askill in analyzed_skills:
        canonical = askill["canonical_name"]
        cat = askill["category"]

        # Ensure skill exists in DB taxonomy
        sk_obj = db.query(Skill).filter(Skill.canonical_name == canonical).first()
        if not sk_obj:
            sk_obj = Skill(canonical_name=canonical, category=cat, description=f"Skill: {canonical}")
            db.add(sk_obj)
            db.commit()
            db.refresh(sk_obj)

        rskill = ResumeSkill(
            analysis_id=analysis.id,
            skill_id=sk_obj.id,
            original_text=askill["original_text"],
            section_name=askill["section_name"],
            extraction_confidence=askill["extraction_confidence"],
            evidence_classification=askill["evidence_classification"],
            evidence_confidence=askill["evidence_confidence"]
        )
        db.add(rskill)
        db.flush()

        for ev in askill["evidence_records"]:
            ev_row = SkillEvidence(
                resume_skill_id=rskill.id,
                evidence_type=ev["evidence_type"],
                source_section=ev["source_section"],
                evidence_text=ev["evidence_text"],
                evidence_strength=ev["evidence_strength"],
                explanation=ev["explanation"],
                verification_status=ev["verification_status"]
            )
            db.add(ev_row)

    db.commit()

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        event_type="RESUME_ANALYSIS_COMPLETED",
        resource_type="ResumeAnalysis",
        resource_id=analysis.id
    )
    db.add(audit)
    db.commit()

    return _build_analysis_response(analysis, db, proof_result["skill_proof_score"])

@router.get("/analyses/{analysis_id}", response_model=ResumeAnalysisResponse)
def get_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full resume analysis details by analysis ID."""
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == analysis_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found or access denied.")

    return _build_analysis_response(analysis, db)

@router.get("/analyses/{analysis_id}/skills", response_model=List[ResumeSkillResponse])
def get_analysis_skills(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve list of extracted skills for an analysis."""
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == analysis_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found or access denied.")

    resume_skills = db.query(ResumeSkill).filter(ResumeSkill.analysis_id == analysis.id).all()
    results = []
    for rs in resume_skills:
        sk = rs.skill
        results.append(ResumeSkillResponse(
            id=rs.id,
            skill_id=rs.skill_id,
            canonical_name=sk.canonical_name if sk else "Unknown",
            category=sk.category if sk else "General",
            original_text=rs.original_text,
            section_name=rs.section_name,
            extraction_confidence=rs.extraction_confidence,
            evidence_classification=rs.evidence_classification,
            evidence_confidence=rs.evidence_confidence,
            evidence_records=[
                SkillEvidenceResponse.model_validate(ev) for ev in rs.evidence_records
            ],
            created_at=rs.created_at
        ))
    return results

@router.get("/analyses/{analysis_id}/evidence", response_model=List[SkillEvidenceResponse])
def get_analysis_evidence(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve all evidence records for an analysis."""
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == analysis_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found or access denied.")

    evidence_list = (
        db.query(SkillEvidence)
        .join(ResumeSkill)
        .filter(ResumeSkill.analysis_id == analysis.id)
        .all()
    )
    return [SkillEvidenceResponse.model_validate(ev) for ev in evidence_list]

def _build_analysis_response(analysis: ResumeAnalysis, db: Session, proof_score_override: float = None) -> ResumeAnalysisResponse:
    resume_skills = db.query(ResumeSkill).filter(ResumeSkill.analysis_id == analysis.id).all()
    skills_response = []
    
    for rs in resume_skills:
        sk = rs.skill
        skills_response.append(ResumeSkillResponse(
            id=rs.id,
            skill_id=rs.skill_id,
            canonical_name=sk.canonical_name if sk else "Unknown",
            category=sk.category if sk else "General",
            original_text=rs.original_text,
            section_name=rs.section_name,
            extraction_confidence=rs.extraction_confidence,
            evidence_classification=rs.evidence_classification,
            evidence_confidence=rs.evidence_confidence,
            evidence_records=[
                SkillEvidenceResponse.model_validate(ev) for ev in rs.evidence_records
            ],
            created_at=rs.created_at
        ))

    # Calculate skill proof score if not passed
    if proof_score_override is not None:
        proof_score = proof_score_override
    else:
        calc_list = [{"evidence_confidence": s.evidence_confidence, "evidence_classification": s.evidence_classification} for s in skills_response]
        proof_score = proof_scorer.calculate_skill_proof_score(calc_list)["skill_proof_score"]

    profile_dict = json.loads(analysis.extracted_profile) if analysis.extracted_profile else {}

    return ResumeAnalysisResponse(
        id=analysis.id,
        resume_id=analysis.resume_id,
        user_id=analysis.user_id,
        analysis_version=analysis.analysis_version,
        overall_status=analysis.overall_status,
        extracted_profile=profile_dict,
        skills=skills_response,
        skill_proof_score=proof_score,
        created_at=analysis.created_at
    )
