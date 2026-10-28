from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import ResumeAnalysis, GapReport, ResumeSkill, GapItem, User
from app.schemas.all_schemas import ComparisonReport
from app.api.auth import get_current_user

router = APIRouter(tags=["Analysis History & Comparison"])

@router.get("/analysis-history")
def get_analysis_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all historical resume analysis snapshots for the candidate."""
    analyses = (
        db.query(ResumeAnalysis)
        .filter(ResumeAnalysis.user_id == current_user.id)
        .order_by(ResumeAnalysis.created_at.desc())
        .all()
    )

    history = []
    for a in analyses:
        r = a.resume
        rp = db.query(GapReport).filter(GapReport.analysis_id == a.id).order_by(GapReport.id.desc()).first()
        target_title = "Not evaluated"
        target_type = None
        if rp:
            if rp.job_role:
                target_title = rp.job_role.title
                target_type = "predefined_role"
            elif rp.job_description:
                target_title = rp.job_description.title
                if "custom" in (rp.job_description.title or "").lower():
                    target_type = "custom_job_description"
                else:
                    target_type = "saved_job_description"
            else:
                target_title = "Target Job"
                target_type = "predefined_role"

        history.append({
            "analysis_id": a.id,
            "resume_id": a.resume_id,
            "resume_filename": r.original_filename if r else "Resume",
            "version": a.analysis_version,
            "gap_report_id": rp.id if rp else None,
            "target_role": target_title,
            "target_title": target_title,
            "target_type": target_type,
            "job_role_id": rp.job_role_id if rp else None,
            "job_description_id": rp.job_description_id if rp else None,
            "readiness_score": rp.readiness_score if rp else None,
            "skill_proof_score": rp.skill_proof_score if rp else None,
            "skills_count": len(a.resume_skills),
            "created_at": a.created_at
        })
    return history

@router.get("/analysis-history/compare", response_model=ComparisonReport)
def compare_analyses(
    old_id: int = Query(..., description="ID of baseline older analysis"),
    new_id: int = Query(..., description="ID of revised newer analysis"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Compare two resume analysis versions:
    Reveals newly demonstrated skills, strengthened evidence, resolved gaps,
    and readiness/proof score differentials.
    """
    analysis_old = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == old_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()
    analysis_new = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == new_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()

    if not analysis_old or not analysis_new:
        raise HTTPException(status_code=404, detail="One or both analysis records were not found or access denied.")

    report_old = db.query(GapReport).filter(GapReport.analysis_id == analysis_old.id).order_by(GapReport.id.desc()).first()
    report_new = db.query(GapReport).filter(GapReport.analysis_id == analysis_new.id).order_by(GapReport.id.desc()).first()

    readiness_old = report_old.readiness_score if report_old else 0.0
    readiness_new = report_new.readiness_score if report_new else 0.0
    proof_old = report_old.skill_proof_score if report_old else 0.0
    proof_new = report_new.skill_proof_score if report_new else 0.0

    # Skills comparison
    skills_old_map = {rs.skill.canonical_name: rs for rs in analysis_old.resume_skills if rs.skill}
    skills_new_map = {rs.skill.canonical_name: rs for rs in analysis_new.resume_skills if rs.skill}

    newly_identified = [name for name in skills_new_map if name not in skills_old_map]

    strengthened = []
    for name, new_rs in skills_new_map.items():
        if name in skills_old_map:
            old_rs = skills_old_map[name]
            if new_rs.evidence_confidence > old_rs.evidence_confidence:
                strengthened.append({
                    "skill_name": name,
                    "old_confidence": old_rs.evidence_confidence,
                    "new_confidence": new_rs.evidence_confidence,
                    "delta": round(new_rs.evidence_confidence - old_rs.evidence_confidence, 1),
                    "old_classification": old_rs.evidence_classification,
                    "new_classification": new_rs.evidence_classification
                })

    # Gaps comparison
    resolved_gaps = []
    remaining_gaps = []
    if report_old and report_new:
        old_gaps = {gi.skill.canonical_name: gi for gi in report_old.gap_items if gi.skill}
        new_gaps = {gi.skill.canonical_name: gi for gi in report_new.gap_items if gi.skill}

        for name in old_gaps:
            if name not in new_gaps or (new_gaps[name].candidate_status in ["Strong Match", "Partial Match"] and old_gaps[name].candidate_status == "Missing Skill"):
                resolved_gaps.append(name)

        for name, gi in new_gaps.items():
            if gi.candidate_status in ["Missing Skill", "Claimed Match"]:
                remaining_gaps.append(name)

    readiness_delta = round(readiness_new - readiness_old, 1)
    proof_delta = round(proof_new - proof_old, 1)

    summary_text = (
        f"Compared Analysis #{analysis_old.id} to #{analysis_new.id}. "
        f"Job Readiness shifted by {readiness_delta:+}%, and Skill Proof Score shifted by {proof_delta:+}%."
    )
    if newly_identified:
        summary_text += f" Detected {len(newly_identified)} new skills ({', '.join(newly_identified[:3])})."
    if strengthened:
        summary_text += f" Strengthened evidence for {len(strengthened)} skills."
    if resolved_gaps:
        summary_text += f" Successfully closed {len(resolved_gaps)} priority gaps ({', '.join(resolved_gaps[:3])})."

    return ComparisonReport(
        analysis_id_old=analysis_old.id,
        analysis_id_new=analysis_new.id,
        old_date=analysis_old.created_at,
        new_date=analysis_new.created_at,
        readiness_old=readiness_old,
        readiness_new=readiness_new,
        readiness_delta=readiness_delta,
        proof_old=proof_old,
        proof_new=proof_new,
        proof_delta=proof_delta,
        newly_identified_skills=newly_identified,
        skills_with_stronger_evidence=strengthened,
        resolved_gaps=resolved_gaps,
        remaining_gaps=remaining_gaps,
        summary_explanation=summary_text
    )
