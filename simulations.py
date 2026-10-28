import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import (
    ResumeAnalysis, ResumeSkill, JobRole, ResumeSimulation, GapReport, User
)
from app.schemas.all_schemas import SimulationRequest, SimulationResponse
from app.api.auth import get_current_user
from app.services.simulator_service import simulator_service

router = APIRouter(tags=["Resume Improvement Simulator"])

@router.post("/simulations", response_model=SimulationResponse)
def simulate_resume_improvements(
    sim_in: SimulationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Simulate hypothetical resume enhancements (e.g. adding a project or certification)
    and compute their potential effect on evidence classification, proof score, and readiness score.
    Does not modify genuine resume content.
    """
    analysis = db.query(ResumeAnalysis).filter(
        ResumeAnalysis.id == sim_in.analysis_id,
        ResumeAnalysis.user_id == current_user.id
    ).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Base analysis report not found or access denied.")

    # Fetch base candidate skills
    base_skills = []
    for rs in analysis.resume_skills:
        sk = rs.skill
        base_skills.append({
            "skill_id": rs.skill_id,
            "canonical_name": sk.canonical_name if sk else "Unknown",
            "category": sk.category if sk else "General",
            "original_text": rs.original_text,
            "section_name": rs.section_name,
            "extraction_confidence": rs.extraction_confidence,
            "evidence_classification": rs.evidence_classification,
            "evidence_confidence": rs.evidence_confidence,
            "occurrences": [
                {"section": ev.source_section, "sentence": ev.evidence_text, "matched_text": rs.original_text}
                for ev in rs.evidence_records
            ],
            "all_sections": {ev.source_section for ev in rs.evidence_records}
        })

    # Determine job role requirements
    role_id = sim_in.job_role_id
    if not role_id:
        # Check if there is an existing gap report for this analysis
        existing_report = db.query(GapReport).filter(GapReport.analysis_id == analysis.id).first()
        if existing_report and existing_report.job_role_id:
            role_id = existing_report.job_role_id
        else:
            first_role = db.query(JobRole).first()
            role_id = first_role.id if first_role else 1

    role = db.query(JobRole).filter(JobRole.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Target job role not found.")

    role_reqs = []
    for jrs in role.skills_required:
        sk = jrs.skill
        if sk:
            role_reqs.append({
                "skill_id": sk.id,
                "canonical_name": sk.canonical_name,
                "category": sk.category,
                "requirement_type": jrs.requirement_type,
                "importance_weight": jrs.importance_weight
            })

    sim_payload = [s.model_dump() for s in sim_in.simulated_changes]
    sim_result = simulator_service.run_simulation(base_skills, role_reqs, sim_payload)

    # Persist simulation record
    sim_row = ResumeSimulation(
        user_id=current_user.id,
        base_analysis_id=analysis.id,
        simulated_changes=json.dumps(sim_payload),
        simulated_results=json.dumps(sim_result),
        is_simulation=True
    )
    db.add(sim_row)
    db.commit()
    db.refresh(sim_row)

    return SimulationResponse(
        id=sim_row.id,
        base_analysis_id=analysis.id,
        original_readiness_score=sim_result["original_readiness_score"],
        simulated_readiness_score=sim_result["simulated_readiness_score"],
        score_delta=sim_result["score_delta"],
        original_proof_score=sim_result["original_proof_score"],
        simulated_proof_score=sim_result["simulated_proof_score"],
        simulated_skill_effects=sim_result["simulated_skill_effects"],
        disclaimer=sim_result["disclaimer"],
        created_at=sim_row.created_at
    )

@router.get("/simulations/{simulation_id}", response_model=SimulationResponse)
def get_simulation(
    simulation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve an existing simulation record."""
    sim = db.query(ResumeSimulation).filter(
        ResumeSimulation.id == simulation_id,
        ResumeSimulation.user_id == current_user.id
    ).first()
    if not sim:
        raise HTTPException(status_code=404, detail="Simulation record not found or access denied.")

    res = json.loads(sim.simulated_results)
    return SimulationResponse(
        id=sim.id,
        base_analysis_id=sim.base_analysis_id,
        original_readiness_score=res["original_readiness_score"],
        simulated_readiness_score=res["simulated_readiness_score"],
        score_delta=res["score_delta"],
        original_proof_score=res["original_proof_score"],
        simulated_proof_score=res["simulated_proof_score"],
        simulated_skill_effects=res["simulated_skill_effects"],
        disclaimer=res["disclaimer"],
        created_at=sim.created_at
    )
