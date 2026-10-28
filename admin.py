from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import (
    User, Resume, ResumeAnalysis, GapReport, Skill, SkillAlias,
    JobRole, JobRoleSkill, LearningResource, LearningProgress, AuditEvent
)
from app.schemas.all_schemas import (
    AdminStatsResponse, SkillResponse, SkillCreate,
    JobRoleResponse, JobRoleCreate, JobRoleSkillItem, LearningResourceResponse
)
from app.api.auth import get_admin_user

router = APIRouter(prefix="/admin", tags=["Administration"])

@router.get("/public-stats")
def get_public_platform_stats(db: Session = Depends(get_db)):
    """
    Lightweight public platform statistics shown on the admin login page.
    No authentication required. Does not expose any private or user-specific data.
    """
    return {
        "total_users": db.query(User).count(),
        "total_resumes": db.query(Resume).count(),
        "total_analyses": db.query(ResumeAnalysis).count(),
        "total_skills_in_taxonomy": db.query(Skill).count(),
        "total_job_roles": db.query(JobRole).count(),
        "total_learning_resources": db.query(LearningResource).count(),
    }

@router.get("/statistics", response_model=AdminStatsResponse)
def get_admin_statistics(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Platform-level anonymized statistics for administrators.
    """
    return AdminStatsResponse(
        total_users=db.query(User).count(),
        total_resumes=db.query(Resume).count(),
        total_analyses=db.query(ResumeAnalysis).count(),
        total_gap_reports=db.query(GapReport).count(),
        total_skills_in_taxonomy=db.query(Skill).count(),
        total_job_roles=db.query(JobRole).count(),
        total_learning_resources=db.query(LearningResource).count(),
        active_learning_tasks=db.query(LearningProgress).filter(LearningProgress.status != "Completed").count()
    )

@router.get("/users")
def admin_list_users(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all platform users with account details and usage statistics for administrators.
    """
    users = db.query(User).order_by(User.created_at.desc()).all()
    user_list = []
    for u in users:
        resumes_count = db.query(Resume).filter(Resume.user_id == u.id).count()
        analyses_count = db.query(ResumeAnalysis).filter(ResumeAnalysis.user_id == u.id).count()
        user_list.append({
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "resumes_count": resumes_count,
            "analyses_count": analyses_count
        })
    return {
        "total_users": len(user_list),
        "admin_count": sum(1 for u in user_list if u["role"] == "admin"),
        "candidate_count": sum(1 for u in user_list if u["role"] == "candidate"),
        "users": user_list
    }

@router.get("/skills", response_model=List[SkillResponse])
def admin_list_skills(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List all skills in the platform taxonomy."""
    skills = db.query(Skill).order_by(Skill.category.asc(), Skill.canonical_name.asc()).all()
    return [SkillResponse.model_validate(s) for s in skills]

@router.post("/skills", response_model=SkillResponse)
def admin_create_skill(
    skill_in: SkillCreate,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Add a new canonical skill and its aliases to the taxonomy."""
    existing = db.query(Skill).filter(Skill.canonical_name == skill_in.canonical_name.strip()).first()
    if existing:
        raise HTTPException(status_code=400, detail="Skill already exists in taxonomy.")

    skill = Skill(
        canonical_name=skill_in.canonical_name.strip(),
        category=skill_in.category.strip(),
        description=skill_in.description
    )
    db.add(skill)
    db.commit()
    db.refresh(skill)

    for alias in skill_in.aliases:
        alias_clean = alias.strip()
        if alias_clean:
            db.add(SkillAlias(
                skill_id=skill.id,
                alias=alias_clean,
                normalized_alias=alias_clean.lower()
            ))
    db.commit()

    return SkillResponse.model_validate(skill)

@router.delete("/skills/{skill_id}")
def admin_delete_skill(
    skill_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a skill from the taxonomy."""
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found.")

    db.delete(skill)
    db.commit()
    return {"message": "Skill deleted from taxonomy."}

@router.get("/audit-events")
def admin_list_audit_events(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """List recent platform audit events."""
    events = db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).limit(50).all()
    return [
        {
            "id": e.id,
            "user_id": e.user_id,
            "event_type": e.event_type,
            "resource_type": e.resource_type,
            "resource_id": e.resource_id,
            "created_at": e.created_at
        }
        for e in events
    ]
