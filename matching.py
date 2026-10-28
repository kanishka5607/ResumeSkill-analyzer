import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import (
    ResumeAnalysis, ResumeSkill, JobRole, JobDescription, GapReport,
    GapItem, Skill, User, AuditEvent
)
from app.schemas.all_schemas import (
    MatchRequest, GapReportResponse, GapItemResponse, ReadinessScoreBreakdown
)
from app.api.auth import get_current_user
from app.services.matching_engine import matching_engine
from app.services.readiness_scorer import readiness_scorer
from app.services.proof_scorer import proof_scorer
from app.services.gap_analyzer import gap_analyzer

router = APIRouter(tags=["Matching & Gap Analysis"])

@router.post("/analyses/{analysis_id}/match", response_model=GapReportResponse)
def match_analysis_against_job(
    analysis_id: int,
    request: MatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Match candidate resume skills and evidence against a target job role or job description.
    Computes explainable readiness score, proof score, and prioritized skill gaps.
    """
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == analysis_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found or access denied.")

    # 1. Fetch candidate skills & evidence
    candidate_skills = []
    for rs in analysis.resume_skills:
        sk = rs.skill
        excerpts = [ev.evidence_text for ev in rs.evidence_records]
        candidate_skills.append({
            "skill_id": rs.skill_id,
            "canonical_name": sk.canonical_name if sk else "Unknown",
            "category": sk.category if sk else "General",
            "original_text": rs.original_text,
            "evidence_classification": rs.evidence_classification,
            "evidence_confidence": rs.evidence_confidence,
            "supporting_sentences": excerpts
        })

    # 2. Determine requirements list
    requirements = []
    job_role_title = None
    job_role_id = request.job_role_id
    job_desc_id = request.job_description_id

    if job_role_id:
        role = db.query(JobRole).filter(JobRole.id == job_role_id).first()
        if not role:
            raise HTTPException(status_code=404, detail="Selected job role not found.")
        job_role_title = role.title
        for jrs in role.skills_required:
            sk = jrs.skill
            if sk:
                requirements.append({
                    "skill_id": sk.id,
                    "canonical_name": sk.canonical_name,
                    "category": sk.category,
                    "requirement_type": jrs.requirement_type,
                    "importance_weight": jrs.importance_weight
                })
    elif job_desc_id:
        jd = db.query(JobDescription).filter(
            JobDescription.id == job_desc_id,
            JobDescription.user_id == current_user.id
        ).first()
        if not jd:
            raise HTTPException(status_code=404, detail="Selected job description not found.")
        job_role_title = jd.title
        parsed_reqs = json.loads(jd.extracted_requirements) if jd.extracted_requirements else {}
        for r in parsed_reqs.get("required_skills", []):
            sk = db.query(Skill).filter(Skill.canonical_name == r["canonical_name"]).first()
            requirements.append({
                "skill_id": sk.id if sk else 0,
                "canonical_name": r["canonical_name"],
                "category": r.get("category", "General"),
                "requirement_type": "Required",
                "importance_weight": 2.0
            })
        for r in parsed_reqs.get("preferred_skills", []):
            sk = db.query(Skill).filter(Skill.canonical_name == r["canonical_name"]).first()
            requirements.append({
                "skill_id": sk.id if sk else 0,
                "canonical_name": r["canonical_name"],
                "category": r.get("category", "General"),
                "requirement_type": "Preferred",
                "importance_weight": 1.0
            })
    elif request.custom_description_text:
        # Parse directly
        parsed_reqs = matching_engine.parse_job_description(request.custom_description_text)
        jd_record = JobDescription(
            user_id=current_user.id,
            title="Custom Job Evaluation",
            description_text=request.custom_description_text,
            extracted_requirements=json.dumps(parsed_reqs)
        )
        db.add(jd_record)
        db.commit()
        db.refresh(jd_record)
        job_desc_id = jd_record.id
        job_role_title = "Custom Job Evaluation"

        for r in parsed_reqs.get("required_skills", []):
            sk = db.query(Skill).filter(Skill.canonical_name == r["canonical_name"]).first()
            requirements.append({
                "skill_id": sk.id if sk else 0,
                "canonical_name": r["canonical_name"],
                "category": r.get("category", "General"),
                "requirement_type": "Required",
                "importance_weight": 2.0
            })
        for r in parsed_reqs.get("preferred_skills", []):
            sk = db.query(Skill).filter(Skill.canonical_name == r["canonical_name"]).first()
            requirements.append({
                "skill_id": sk.id if sk else 0,
                "canonical_name": r["canonical_name"],
                "category": r.get("category", "General"),
                "requirement_type": "Preferred",
                "importance_weight": 1.0
            })
    else:
        raise HTTPException(status_code=400, detail="Please select a job role or provide a job description.")

    if not requirements:
        raise HTTPException(status_code=400, detail="No requirements found to evaluate against.")

    # 3. Match candidate against requirements
    match_results = matching_engine.match_candidate_against_requirements(candidate_skills, requirements)

    # 4. Calculate Readiness and Proof Scores
    readiness_breakdown = readiness_scorer.calculate_readiness_score(match_results)
    proof_result = proof_scorer.calculate_skill_proof_score(candidate_skills)

    # 5. Extract and prioritize gaps
    gaps = gap_analyzer.analyze_gaps(match_results)

    # 6. Save GapReport
    report = GapReport(
        analysis_id=analysis.id,
        job_role_id=job_role_id,
        job_description_id=job_desc_id,
        readiness_score=readiness_breakdown["overall_score"],
        skill_proof_score=proof_result["skill_proof_score"],
        scoring_version="v1.0"
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    # 7. Persist GapItems
    for g in gaps:
        sk_id = g["skill_id"]
        if not sk_id or sk_id == 0:
            sk = db.query(Skill).filter(Skill.canonical_name == g["canonical_name"]).first()
            if not sk:
                sk = Skill(canonical_name=g["canonical_name"], category=g.get("category", "General"))
                db.add(sk)
                db.commit()
                db.refresh(sk)
            sk_id = sk.id

        gitem = GapItem(
            gap_report_id=report.id,
            skill_id=sk_id,
            requirement_type=g["requirement_type"],
            candidate_status=g["candidate_status"],
            gap_priority=g["gap_priority"],
            evidence_confidence=g["evidence_confidence"],
            explanation=g["explanation"],
            recommended_action=g["recommended_action"]
        )
        db.add(gitem)

    db.commit()

    # Audit event
    audit = AuditEvent(
        user_id=current_user.id,
        event_type="JOB_MATCH_COMPLETED",
        resource_type="GapReport",
        resource_id=report.id
    )
    db.add(audit)
    db.commit()

    return _build_gap_report_response(report, db, readiness_breakdown)

@router.get("/analyses/{analysis_id}/gap-reports/latest", response_model=GapReportResponse)
def get_latest_gap_report_for_analysis(
    analysis_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve the most recent gap report for a specific analysis.
    Verifies that the analysis belongs to current_user.
    Returns 404 if no report exists for this analysis.
    """
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == analysis_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found or access denied.")

    report = (
        db.query(GapReport)
        .filter(GapReport.analysis_id == analysis.id)
        .order_by(GapReport.id.desc())
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="No gap evaluation report exists for this analysis.")

    return _build_gap_report_response(report, db)

@router.get("/gap-reports/{report_id}", response_model=GapReportResponse)
def get_gap_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve full gap analysis report and score explanation by report ID."""
    report = (
        db.query(GapReport)
        .join(ResumeAnalysis)
        .filter(GapReport.id == report_id, ResumeAnalysis.user_id == current_user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Gap report not found or access denied.")

    return _build_gap_report_response(report, db)

@router.get("/gap-reports/{report_id}/items", response_model=List[GapItemResponse])
def get_gap_report_items(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve prioritized gap items for a gap report."""
    report = (
        db.query(GapReport)
        .join(ResumeAnalysis)
        .filter(GapReport.id == report_id, ResumeAnalysis.user_id == current_user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Gap report not found or access denied.")

    priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    items = sorted(report.gap_items, key=lambda x: priority_order.get(x.gap_priority, 4))
    
    results = []
    for gi in items:
        sk = gi.skill
        results.append(GapItemResponse(
            id=gi.id,
            skill_id=gi.skill_id,
            canonical_name=sk.canonical_name if sk else "Unknown",
            category=sk.category if sk else "General",
            requirement_type=gi.requirement_type,
            candidate_status=gi.candidate_status,
            gap_priority=gi.gap_priority,
            evidence_confidence=gi.evidence_confidence,
            explanation=gi.explanation,
            recommended_action=gi.recommended_action,
            supporting_excerpts=[]
        ))
    return results

def _build_gap_report_response(
    report: GapReport,
    db: Session,
    readiness_breakdown: Optional[Dict[str, Any]] = None
) -> GapReportResponse:
    job_title = report.job_role.title if report.job_role else (report.job_description.title if report.job_description else "Target Job")

    priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    items = sorted(report.gap_items, key=lambda x: priority_order.get(x.gap_priority, 4))
    
    gap_items_res = []
    for gi in items:
        sk = gi.skill
        gap_items_res.append(GapItemResponse(
            id=gi.id,
            skill_id=gi.skill_id,
            canonical_name=sk.canonical_name if sk else "Unknown",
            category=sk.category if sk else "General",
            requirement_type=gi.requirement_type,
            candidate_status=gi.candidate_status,
            gap_priority=gi.gap_priority,
            evidence_confidence=gi.evidence_confidence,
            explanation=gi.explanation,
            recommended_action=gi.recommended_action,
            supporting_excerpts=[]
        ))

    if not readiness_breakdown:
        readiness_breakdown = {
            "overall_score": report.readiness_score,
            "scoring_formula": f"Readiness Score: {report.readiness_score}% based on weighted evidence requirements.",
            "total_requirements": len(gap_items_res),
            "strong_matches_count": sum(1 for g in gap_items_res if g.candidate_status == "Strong Match"),
            "partial_matches_count": sum(1 for g in gap_items_res if g.candidate_status == "Partial Match"),
            "claimed_matches_count": sum(1 for g in gap_items_res if g.candidate_status == "Claimed Match"),
            "missing_count": sum(1 for g in gap_items_res if g.candidate_status == "Missing Skill"),
            "positive_factors": [f"Candidate has evidence-backed or partial alignment in {g.canonical_name}" for g in gap_items_res if g.candidate_status in ["Strong Match", "Partial Match"]][:4],
            "negative_factors": [f"Needs practical project evidence or training for {g.canonical_name}" for g in gap_items_res if g.candidate_status in ["Missing Skill", "Claimed Match"]][:4],
            "limitations_disclaimer": "This score is a transparent evidence-based heuristic reflecting resume documentation depth."
        }

    return GapReportResponse(
        id=report.id,
        analysis_id=report.analysis_id,
        job_role_id=report.job_role_id,
        job_role_title=job_title,
        job_description_id=report.job_description_id,
        readiness_score=report.readiness_score,
        skill_proof_score=report.skill_proof_score,
        scoring_version=report.scoring_version,
        score_breakdown=ReadinessScoreBreakdown(**readiness_breakdown),
        gap_items=gap_items_res,
        created_at=report.created_at
    )
