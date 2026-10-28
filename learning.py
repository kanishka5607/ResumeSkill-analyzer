from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import (
    Skill, LearningResource, LearningProgress, GapItem, GapReport,
    ResumeAnalysis, ResumeSkill, User, AuditEvent
)
from app.schemas.all_schemas import (
    LearningResourceResponse, LearningProgressResponse,
    LearningProgressCreate, LearningProgressUpdate, SkillRoadmap
)
from app.api.auth import get_current_user
from app.services.roadmap_generator import roadmap_generator
from app.services.assessment_engine import assessment_engine

class AssessmentSubmitRequest(BaseModel):
    skill_name: str
    answers: Dict[int, int]

router = APIRouter(tags=["Learning & Upskilling Roadmap"])

def _verify_gap_item_ownership(gap_item_id: Optional[int], user_id: int, db: Session) -> Optional[GapItem]:
    """
    Verify that a gap_item_id, if supplied, belongs to a gap report owned by the
    authenticated user. Returns the GapItem if valid, None if gap_item_id is None.
    Raises 403 if the gap item belongs to another user.
    """
    if gap_item_id is None:
        return None
    gap_item = db.query(GapItem).filter(GapItem.id == gap_item_id).first()
    if not gap_item:
        raise HTTPException(status_code=404, detail="Gap item not found.")
    # Traverse: GapItem -> GapReport -> ResumeAnalysis -> user_id
    gap_report = db.query(GapReport).filter(GapReport.id == gap_item.gap_report_id).first()
    if not gap_report:
        raise HTTPException(status_code=404, detail="Associated gap report not found.")
    analysis = db.query(ResumeAnalysis).filter(ResumeAnalysis.id == gap_report.analysis_id).first()
    if not analysis or analysis.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: this gap item does not belong to your account."
        )
    return gap_item

@router.get("/skills/{skill_id}/resources", response_model=List[LearningResourceResponse])
def get_skill_resources(skill_id: int, db: Session = Depends(get_db)):
    """Retrieve curated learning resources for a specific skill."""
    resources = db.query(LearningResource).filter(LearningResource.skill_id == skill_id).all()
    return [LearningResourceResponse.model_validate(r) for r in resources]

@router.get("/learning/roadmap/{skill_id}", response_model=SkillRoadmap)
def get_skill_roadmap(
    skill_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate an actionable 7-step upskilling roadmap for a specific skill,
    linking curated learning resources and portfolio project blueprints.
    Dynamically resolves gap priority, requirement type, and evidence score
    from the user's latest gap analysis instead of using hardcoded values.
    """
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")

    # Resolve dynamic values from the user's latest gap analysis for this skill
    gap_priority = "High"
    requirement_type = "Required"
    current_evidence_score = 0.0

    # Find the most recent GapItem for this skill belonging to this user
    latest_gap_item = (
        db.query(GapItem)
        .join(GapReport, GapItem.gap_report_id == GapReport.id)
        .join(ResumeAnalysis, GapReport.analysis_id == ResumeAnalysis.id)
        .filter(
            ResumeAnalysis.user_id == current_user.id,
            GapItem.skill_id == skill_id
        )
        .order_by(GapReport.id.desc())
        .first()
    )

    if latest_gap_item:
        gap_priority = latest_gap_item.gap_priority or gap_priority
        requirement_type = latest_gap_item.requirement_type or requirement_type
        current_evidence_score = latest_gap_item.evidence_confidence or 0.0

    # Also check if there's a ResumeSkill with a higher evidence score
    latest_resume_skill = (
        db.query(ResumeSkill)
        .join(ResumeAnalysis, ResumeSkill.analysis_id == ResumeAnalysis.id)
        .filter(
            ResumeAnalysis.user_id == current_user.id,
            ResumeSkill.skill_id == skill_id
        )
        .order_by(ResumeAnalysis.id.desc())
        .first()
    )
    if latest_resume_skill and latest_resume_skill.evidence_confidence:
        current_evidence_score = max(current_evidence_score, latest_resume_skill.evidence_confidence)

    resources = db.query(LearningResource).filter(LearningResource.skill_id == skill.id).all()
    res_dicts = [
        {
            "id": r.id,
            "skill_id": r.skill_id,
            "title": r.title,
            "provider": r.provider,
            "resource_url": r.resource_url,
            "resource_type": r.resource_type,
            "difficulty_level": r.difficulty_level,
            "estimated_effort": r.estimated_effort,
            "description": r.description
        }
        for r in resources
    ]

    roadmap_data = roadmap_generator.generate_skill_roadmap(
        skill_name=skill.canonical_name,
        category=skill.category,
        gap_priority=gap_priority,
        requirement_type=requirement_type,
        current_evidence_score=current_evidence_score,
        resources=res_dicts
    )

    return SkillRoadmap(
        skill_id=skill.id,
        canonical_name=skill.canonical_name,
        category=skill.category,
        gap_priority=gap_priority,
        requirement_type=requirement_type,
        current_evidence_score=current_evidence_score,
        steps=roadmap_data["steps"],
        resources=[LearningResourceResponse.model_validate(r) for r in resources]
    )

@router.get("/learning/progress", response_model=List[LearningProgressResponse])
def list_learning_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all learning tasks tracked by the authenticated candidate."""
    tasks = (
        db.query(LearningProgress)
        .filter(LearningProgress.user_id == current_user.id)
        .order_by(LearningProgress.created_at.desc())
        .all()
    )
    results = []
    for t in tasks:
        lr = t.learning_resource
        sk = lr.skill if lr else None
        results.append(LearningProgressResponse(
            id=t.id,
            user_id=t.user_id,
            gap_item_id=t.gap_item_id,
            learning_resource_id=t.learning_resource_id,
            resource_title=lr.title if lr else "Resource",
            skill_name=sk.canonical_name if sk else "Skill",
            status=t.status,
            started_at=t.started_at,
            completed_at=t.completed_at,
            user_notes=t.user_notes,
            created_at=t.created_at
        ))
    return results

@router.post("/learning/progress", response_model=LearningProgressResponse)
def start_learning_task(
    item_in: LearningProgressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enroll in a learning resource / task to track upskilling progress."""
    lr = db.query(LearningResource).filter(LearningResource.id == item_in.learning_resource_id).first()
    if not lr:
        raise HTTPException(status_code=404, detail="Learning resource not found.")

    # Verify gap_item_id ownership if supplied
    _verify_gap_item_ownership(item_in.gap_item_id, current_user.id, db)

    progress = LearningProgress(
        user_id=current_user.id,
        gap_item_id=item_in.gap_item_id,
        learning_resource_id=item_in.learning_resource_id,
        status=item_in.status,
        started_at=datetime.now(timezone.utc),
        user_notes=item_in.user_notes
    )
    db.add(progress)
    db.commit()
    db.refresh(progress)

    sk = lr.skill
    return LearningProgressResponse(
        id=progress.id,
        user_id=progress.user_id,
        gap_item_id=progress.gap_item_id,
        learning_resource_id=progress.learning_resource_id,
        resource_title=lr.title,
        skill_name=sk.canonical_name if sk else "Skill",
        status=progress.status,
        started_at=progress.started_at,
        completed_at=progress.completed_at,
        user_notes=progress.user_notes,
        created_at=progress.created_at
    )

@router.patch("/learning/progress/{progress_id}", response_model=LearningProgressResponse)
def update_learning_progress(
    progress_id: int,
    item_update: LearningProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update progress status ('Not Started', 'In Progress', 'Completed').
    Note: Completion marks candidate activity; actual score upgrade requires updating the resume with genuine evidence.
    """
    progress = db.query(LearningProgress).filter(
        LearningProgress.id == progress_id,
        LearningProgress.user_id == current_user.id
    ).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Learning progress record not found or access denied.")

    progress.status = item_update.status
    if item_update.user_notes is not None:
        progress.user_notes = item_update.user_notes

    if item_update.status == "Completed" and not progress.completed_at:
        progress.completed_at = datetime.now(timezone.utc)
    elif item_update.status != "Completed":
        progress.completed_at = None

    db.commit()
    db.refresh(progress)

    lr = progress.learning_resource
    sk = lr.skill if lr else None

    return LearningProgressResponse(
        id=progress.id,
        user_id=progress.user_id,
        gap_item_id=progress.gap_item_id,
        learning_resource_id=progress.learning_resource_id,
        resource_title=lr.title if lr else "Resource",
        skill_name=sk.canonical_name if sk else "Skill",
        status=progress.status,
        started_at=progress.started_at,
        completed_at=progress.completed_at,
        user_notes=progress.user_notes,
        created_at=progress.created_at
    )

@router.get("/learning/assessment/{skill_name}")
def get_skill_assessment(
    skill_name: str,
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve an interactive Q&A assessment and knowledge check round for a target skill.
    Includes practical multiple choice questions and study progression paths.
    """
    assessment = assessment_engine.get_assessment_for_skill(skill_name)
    return assessment

@router.post("/learning/assessment/submit")
def submit_skill_assessment(
    payload: AssessmentSubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Evaluate user's answers in the Skill Q&A Assessment round.
    If passed (score >= 80%), unlocks verification and reveals what to study next.
    """
    result = assessment_engine.evaluate_assessment(payload.skill_name, payload.answers)
    
    # Audit log entry for verification attempt
    audit = AuditEvent(
        user_id=current_user.id,
        event_type="skill_assessment_submitted",
        resource_type="SkillAssessment",
        resource_id=0
    )
    db.add(audit)
    db.commit()

    return result
