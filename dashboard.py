import json
from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import (
    Resume, ResumeAnalysis, ResumeSkill, GapReport, GapItem,
    LearningProgress, User
)
from app.schemas.all_schemas import DashboardSummary
from app.api.auth import get_current_user

router = APIRouter(tags=["Candidate Dashboard"])

@router.get("/dashboard", response_model=DashboardSummary)
def get_candidate_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Candidate Dashboard metrics and insights based entirely on actual user records.
    """
    # 1. Fetch user analyses
    analyses = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == current_user.id)
        .order_by(ResumeAnalysis.created_at.desc())
        .all()
    )

    if not analyses:
        # Return empty state for new user
        return DashboardSummary(
            latest_readiness_score=None,
            latest_proof_score=None,
            extracted_skills_count=0,
            evidence_backed_count=0,
            weakly_supported_count=0,
            claimed_only_count=0,
            gaps_count=0,
            learning_in_progress_count=0,
            recent_analyses=[],
            top_demonstrated_skills=[],
            skills_needing_evidence=[],
            highest_priority_gaps=[],
            recommended_next_action="Upload your resume (PDF or DOCX) to extract evidence and discover your job readiness score."
        )

    latest_analysis = analyses[0]

    # 2. Fetch skills for latest analysis
    skills = db.query(ResumeSkill).filter(ResumeSkill.analysis_id == latest_analysis.id).all()
    
    extracted_count = len(skills)
    backed_count = sum(1 for s in skills if s.evidence_classification == "Evidence-Backed Skill")
    weakly_count = sum(1 for s in skills if s.evidence_classification == "Weakly Supported Skill")
    claimed_count = sum(1 for s in skills if s.evidence_classification == "Claimed Skill")

    # 3. Fetch latest gap report
    latest_report = (
        db.query(GapReport)
        .filter(GapReport.analysis_id == latest_analysis.id)
        .order_by(GapReport.id.desc())
        .first()
    )

    readiness_score = latest_report.readiness_score if latest_report else None
    proof_score = latest_report.skill_proof_score if latest_report else None

    # 4. Fetch gaps for report
    priority_order = {"Critical": 0, "High": 1, "Medium": 2, "Low": 3}
    gaps_count = 0
    highest_priority_gaps = []
    if latest_report:
        gap_items = db.query(GapItem).filter(GapItem.gap_report_id == latest_report.id).all()
        gaps_count = len(gap_items)
        sorted_gaps = sorted(gap_items, key=lambda x: priority_order.get(x.gap_priority, 4))
        for g in sorted_gaps[:5]:
            sk = g.skill
            highest_priority_gaps.append({
                "skill_name": sk.canonical_name if sk else "Unknown",
                "category": sk.category if sk else "General",
                "requirement_type": g.requirement_type,
                "gap_priority": g.gap_priority,
                "evidence_confidence": g.evidence_confidence,
                "recommended_action": g.recommended_action
            })

    # 5. Top demonstrated skills & skills needing evidence
    sorted_skills = sorted(skills, key=lambda x: x.evidence_confidence, reverse=True)
    top_demonstrated = []
    for s in sorted_skills[:5]:
        if s.evidence_confidence >= 40.0:
            sk = s.skill
            top_demonstrated.append({
                "skill_name": sk.canonical_name if sk else s.original_text,
                "category": sk.category if sk else "General",
                "classification": s.evidence_classification,
                "confidence": s.evidence_confidence,
                "section": s.section_name
            })

    skills_needing_evidence = []
    for s in sorted(skills, key=lambda x: x.evidence_confidence):
        if s.evidence_classification in ["Claimed Skill", "Weakly Supported Skill"]:
            sk = s.skill
            skills_needing_evidence.append({
                "skill_name": sk.canonical_name if sk else s.original_text,
                "category": sk.category if sk else "General",
                "classification": s.evidence_classification,
                "confidence": s.evidence_confidence,
                "section": s.section_name
            })
            if len(skills_needing_evidence) >= 5:
                break

    # 6. Active learning tasks
    learning_active = db.query(LearningProgress).filter(
        LearningProgress.user_id == current_user.id,
        LearningProgress.status.in_(["In Progress", "Not Started"])
    ).count()

    # 7. Recent analyses summary
    recent_analyses = []
    for a in analyses[:5]:
        r = a.resume
        rp = db.query(GapReport).filter(GapReport.analysis_id == a.id).first()
        recent_analyses.append({
            "analysis_id": a.id,
            "resume_filename": r.original_filename if r else "Resume",
            "version": a.analysis_version,
            "readiness_score": rp.readiness_score if rp else None,
            "created_at": a.created_at.strftime("%Y-%m-%d %H:%M")
        })

    # 8. Recommend next action
    if highest_priority_gaps:
        top_gap = highest_priority_gaps[0]
        rec_action = f"Focus on bridging your {top_gap['gap_priority']} gap: {top_gap['skill_name']}. {top_gap['recommended_action']}"
    elif not latest_report:
        rec_action = "Select a target job role or paste a job description to calculate your job readiness score."
    else:
        rec_action = "Review your evidence details or try the Resume Improvement Simulator to plan project upgrades."

    return DashboardSummary(
        latest_readiness_score=readiness_score,
        latest_proof_score=proof_score,
        extracted_skills_count=extracted_count,
        evidence_backed_count=backed_count,
        weakly_supported_count=weakly_count,
        claimed_only_count=claimed_count,
        gaps_count=gaps_count,
        learning_in_progress_count=learning_active,
        recent_analyses=recent_analyses,
        top_demonstrated_skills=top_demonstrated,
        skills_needing_evidence=skills_needing_evidence,
        highest_priority_gaps=highest_priority_gaps,
        recommended_next_action=rec_action
    )
