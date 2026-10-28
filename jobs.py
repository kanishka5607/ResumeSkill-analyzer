import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.all_models import JobRole, JobRoleSkill, JobDescription, Skill, User
from app.schemas.all_schemas import (
    JobRoleResponse, JobRoleCreate, JobRoleSkillItem,
    JobDescriptionCreate, JobDescriptionResponse
)
from app.api.auth import get_current_user
from app.services.matching_engine import matching_engine

router = APIRouter(tags=["Job Requirements"])

@router.get("/job-roles", response_model=List[JobRoleResponse])
def list_job_roles(db: Session = Depends(get_db)):
    """List all available job role templates."""
    roles = db.query(JobRole).order_by(JobRole.id.asc()).all()
    results = []
    for r in roles:
        skill_items = []
        for jrs in r.skills_required:
            sk = jrs.skill
            if sk:
                skill_items.append(JobRoleSkillItem(
                    skill_id=sk.id,
                    canonical_name=sk.canonical_name,
                    category=sk.category,
                    requirement_type=jrs.requirement_type,
                    importance_weight=jrs.importance_weight,
                    minimum_proficiency=jrs.minimum_proficiency
                ))
        results.append(JobRoleResponse(
            id=r.id,
            title=r.title,
            description=r.description,
            is_custom=r.is_custom,
            skills=skill_items,
            created_at=r.created_at
        ))
    return results

@router.get("/job-roles/{job_role_id}", response_model=JobRoleResponse)
def get_job_role(job_role_id: int, db: Session = Depends(get_db)):
    """Get details of a specific job role."""
    r = db.query(JobRole).filter(JobRole.id == job_role_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Job role not found.")

    skill_items = []
    for jrs in r.skills_required:
        sk = jrs.skill
        if sk:
            skill_items.append(JobRoleSkillItem(
                skill_id=sk.id,
                canonical_name=sk.canonical_name,
                category=sk.category,
                requirement_type=jrs.requirement_type,
                importance_weight=jrs.importance_weight,
                minimum_proficiency=jrs.minimum_proficiency
            ))
    return JobRoleResponse(
        id=r.id,
        title=r.title,
        description=r.description,
        is_custom=r.is_custom,
        skills=skill_items,
        created_at=r.created_at
    )

@router.post("/job-roles", response_model=JobRoleResponse)
def create_custom_job_role(
    role_in: JobRoleCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a custom target job role with specified skills."""
    role = JobRole(
        title=role_in.title.strip(),
        description=role_in.description,
        is_custom=True,
        created_by=current_user.id
    )
    db.add(role)
    db.commit()
    db.refresh(role)

    # Add required skills
    for sid in role_in.required_skill_ids:
        sk = db.query(Skill).filter(Skill.id == sid).first()
        if sk:
            jrs = JobRoleSkill(
                job_role_id=role.id,
                skill_id=sk.id,
                requirement_type="Required",
                importance_weight=2.0,
                minimum_proficiency="Intermediate"
            )
            db.add(jrs)

    # Add preferred skills
    for sid in role_in.preferred_skill_ids:
        sk = db.query(Skill).filter(Skill.id == sid).first()
        if sk:
            jrs = JobRoleSkill(
                job_role_id=role.id,
                skill_id=sk.id,
                requirement_type="Preferred",
                importance_weight=1.0,
                minimum_proficiency="Beginner"
            )
            db.add(jrs)

    db.commit()
    return get_job_role(role.id, db)

@router.post("/job-descriptions/analyze", response_model=JobDescriptionResponse)
def analyze_job_description(
    jd_in: JobDescriptionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Parse a custom pasted job description, extract required and preferred skills,
    and persist for matching.
    """
    if len(jd_in.description_text.strip()) < 30:
        raise HTTPException(
            status_code=400,
            detail="Job description text is too short. Please provide a detailed description with responsibilities and requirements."
        )

    parsed = matching_engine.parse_job_description(jd_in.description_text)

    jd_record = JobDescription(
        user_id=current_user.id,
        title=jd_in.title.strip() or "Custom Target Role",
        description_text=jd_in.description_text,
        extracted_requirements=json.dumps(parsed)
    )
    db.add(jd_record)
    db.commit()
    db.refresh(jd_record)

    return JobDescriptionResponse(
        id=jd_record.id,
        title=jd_record.title,
        description_text=jd_record.description_text,
        extracted_requirements=parsed,
        created_at=jd_record.created_at
    )

@router.get("/job-descriptions/{job_description_id}", response_model=JobDescriptionResponse)
def get_job_description(
    job_description_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve details of a parsed job description."""
    jd = db.query(JobDescription).filter(
        JobDescription.id == job_description_id,
        JobDescription.user_id == current_user.id
    ).first()
    if not jd:
        raise HTTPException(status_code=404, detail="Job description not found or access denied.")

    parsed = json.loads(jd.extracted_requirements) if jd.extracted_requirements else {}
    return JobDescriptionResponse(
        id=jd.id,
        title=jd.title,
        description_text=jd.description_text,
        extracted_requirements=parsed,
        created_at=jd.created_at
    )
