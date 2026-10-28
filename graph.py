import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import ResumeAnalysis, GapReport, User
from app.schemas.all_schemas import EvidenceGraphResponse
from app.api.auth import get_current_user
from app.services.graph_generator import graph_generator

router = APIRouter(tags=["Skill Evidence Graph"])

@router.get("/graph/{analysis_id}", response_model=EvidenceGraphResponse)
def get_evidence_graph(
    analysis_id: int,
    gap_report_id: Optional[int] = Query(None, description="Optional specific gap report ID to build the graph for"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an interactive node-link knowledge graph connecting:
    Candidate -> Skills -> Evidence Records -> Target Role -> Gaps -> Upskilling.
    """
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == analysis_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis report not found or access denied.")

    # Validate specific gap_report_id if provided, else use latest gap report
    gap_report = None
    if gap_report_id is not None:
        gap_report = db.query(GapReport).filter(GapReport.id == gap_report_id).first()
        if not gap_report:
            raise HTTPException(status_code=404, detail="Gap report not found.")
        if gap_report.analysis_id != analysis.id:
            raise HTTPException(
                status_code=400,
                detail="Gap report does not belong to the specified analysis."
            )
    else:
        gap_report = db.query(GapReport).filter(
            GapReport.analysis_id == analysis.id
        ).order_by(GapReport.id.desc()).first()

    profile = json.loads(analysis.extracted_profile) if analysis.extracted_profile else {}
    cand_name = profile.get("candidate_name", current_user.full_name)

    # Prepare skills list
    skills_data = []
    for rs in analysis.resume_skills:
        sk = rs.skill
        skills_data.append({
            "canonical_name": sk.canonical_name if sk else rs.original_text,
            "category": sk.category if sk else "General",
            "evidence_classification": rs.evidence_classification,
            "evidence_confidence": rs.evidence_confidence,
            "evidence_records": [
                {
                    "evidence_type": ev.evidence_type,
                    "evidence_text": ev.evidence_text
                }
                for ev in rs.evidence_records
            ]
        })

    # Prepare match results if gap report exists
    match_results = []
    role_title = "Target Job Role"

    if gap_report:
        role_title = (
            gap_report.job_role.title if gap_report.job_role
            else (gap_report.job_description.title if gap_report.job_description else "Target Role")
        )
        for gi in gap_report.gap_items:
            sk = gi.skill
            match_results.append({
                "canonical_name": sk.canonical_name if sk else "Skill",
                "candidate_status": gi.candidate_status,
                "requirement_type": gi.requirement_type
            })

    # Extract project titles if available in parsed sections
    project_text = profile.get("sections", {}).get("Projects", "")
    project_lines = [p.strip() for p in project_text.split("\n") if p.strip() and not p.strip().startswith("•") and len(p.strip()) < 50][:4]

    graph_data = graph_generator.generate_graph(
        candidate_name=cand_name,
        skills=skills_data,
        role_title=role_title,
        match_results=match_results,
        projects=project_lines
    )

    return EvidenceGraphResponse(
        nodes=graph_data["nodes"],
        edges=graph_data["edges"],
        gap_report_id=gap_report.id if gap_report else None,
        target_role=role_title
    )
