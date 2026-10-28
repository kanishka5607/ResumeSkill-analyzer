import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, DateTime, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.database.session import Base

def utc_now():
    return datetime.now(timezone.utc)

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="candidate")  # candidate, admin
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    analyses = relationship("ResumeAnalysis", back_populates="user", cascade="all, delete-orphan")
    simulations = relationship("ResumeSimulation", back_populates="user", cascade="all, delete-orphan")
    learning_progress = relationship("LearningProgress", back_populates="user", cascade="all, delete-orphan")
    job_descriptions = relationship("JobDescription", back_populates="user", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="user", cascade="all, delete-orphan")

class Resume(Base):
    __tablename__ = "resumes"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    storage_key = Column(String(512), nullable=False)
    extracted_text = Column(Text, nullable=True)
    file_type = Column(String(20), nullable=False)  # pdf, docx
    processing_status = Column(String(50), default="uploaded")  # uploaded, parsed, failed
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="resumes")
    analyses = relationship("ResumeAnalysis", back_populates="resume", cascade="all, delete-orphan")

class ResumeAnalysis(Base):
    __tablename__ = "resume_analyses"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_version = Column(Integer, default=1)
    extracted_profile = Column(Text, nullable=True)  # JSON-encoded parsed sections & metadata
    overall_status = Column(String(50), default="completed")
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    resume = relationship("Resume", back_populates="analyses")
    user = relationship("User", back_populates="analyses")
    resume_skills = relationship("ResumeSkill", back_populates="analysis", cascade="all, delete-orphan")
    gap_reports = relationship("GapReport", back_populates="analysis", cascade="all, delete-orphan")
    simulations = relationship("ResumeSimulation", back_populates="base_analysis", cascade="all, delete-orphan")

class Skill(Base):
    __tablename__ = "skills"
    
    id = Column(Integer, primary_key=True, index=True)
    canonical_name = Column(String(100), unique=True, index=True, nullable=False)
    category = Column(String(80), nullable=False, index=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    aliases = relationship("SkillAlias", back_populates="skill", cascade="all, delete-orphan")
    resume_skills = relationship("ResumeSkill", back_populates="skill")
    job_role_skills = relationship("JobRoleSkill", back_populates="skill")
    learning_resources = relationship("LearningResource", back_populates="skill")

class SkillAlias(Base):
    __tablename__ = "skill_aliases"
    
    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    alias = Column(String(100), nullable=False, index=True)
    normalized_alias = Column(String(100), nullable=False, index=True)
    
    # Relationships
    skill = relationship("Skill", back_populates="aliases")

class ResumeSkill(Base):
    __tablename__ = "resume_skills"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("resume_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False, index=True)
    original_text = Column(String(200), nullable=False)
    section_name = Column(String(100), nullable=False)  # Skills, Projects, Experience, Certifications, Education
    extraction_confidence = Column(Float, default=1.0)
    evidence_classification = Column(String(50), default="Claimed Skill")  # Evidence-Backed Skill, Claimed Skill, Weakly Supported Skill, Verified Skill
    evidence_confidence = Column(Float, default=0.0)  # 0 to 100
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    analysis = relationship("ResumeAnalysis", back_populates="resume_skills")
    skill = relationship("Skill", back_populates="resume_skills")
    evidence_records = relationship("SkillEvidence", back_populates="resume_skill", cascade="all, delete-orphan")

class SkillEvidence(Base):
    __tablename__ = "skill_evidence"
    
    id = Column(Integer, primary_key=True, index=True)
    resume_skill_id = Column(Integer, ForeignKey("resume_skills.id", ondelete="CASCADE"), nullable=False, index=True)
    evidence_type = Column(String(50), nullable=False)  # Project, Experience, Certification, Education, SkillListOnly
    source_section = Column(String(100), nullable=False)
    evidence_text = Column(Text, nullable=False)
    evidence_strength = Column(Float, default=0.0)  # Contributed weight / score
    explanation = Column(Text, nullable=True)
    verification_status = Column(String(50), default="Unverified (Resume Claim)")
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    resume_skill = relationship("ResumeSkill", back_populates="evidence_records")

class JobRole(Base):
    __tablename__ = "job_roles"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_custom = Column(Boolean, default=False)
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    skills_required = relationship("JobRoleSkill", back_populates="job_role", cascade="all, delete-orphan")
    gap_reports = relationship("GapReport", back_populates="job_role")

class JobRoleSkill(Base):
    __tablename__ = "job_role_skills"
    
    id = Column(Integer, primary_key=True, index=True)
    job_role_id = Column(Integer, ForeignKey("job_roles.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    requirement_type = Column(String(50), default="Required")  # Required, Preferred
    importance_weight = Column(Float, default=2.0)  # 2.0 for required, 1.0 for preferred
    minimum_proficiency = Column(String(50), default="Intermediate")
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    job_role = relationship("JobRole", back_populates="skills_required")
    skill = relationship("Skill", back_populates="job_role_skills")

class JobDescription(Base):
    __tablename__ = "job_descriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description_text = Column(Text, nullable=False)
    extracted_requirements = Column(Text, nullable=True)  # JSON of extracted skills & priorities
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="job_descriptions")
    gap_reports = relationship("GapReport", back_populates="job_description")

class GapReport(Base):
    __tablename__ = "gap_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    analysis_id = Column(Integer, ForeignKey("resume_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    job_role_id = Column(Integer, ForeignKey("job_roles.id", ondelete="SET NULL"), nullable=True, index=True)
    job_description_id = Column(Integer, ForeignKey("job_descriptions.id", ondelete="SET NULL"), nullable=True, index=True)
    readiness_score = Column(Float, default=0.0)  # 0 to 100
    skill_proof_score = Column(Float, default=0.0)  # 0 to 100
    scoring_version = Column(String(50), default="v1.0")
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    analysis = relationship("ResumeAnalysis", back_populates="gap_reports")
    job_role = relationship("JobRole", back_populates="gap_reports")
    job_description = relationship("JobDescription", back_populates="gap_reports")
    gap_items = relationship("GapItem", back_populates="gap_report", cascade="all, delete-orphan")

class GapItem(Base):
    __tablename__ = "gap_items"
    
    id = Column(Integer, primary_key=True, index=True)
    gap_report_id = Column(Integer, ForeignKey("gap_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False, index=True)
    requirement_type = Column(String(50), default="Required")  # Required, Preferred
    candidate_status = Column(String(50), default="Missing")  # Strong Match, Partial Match, Claimed Match, Missing Skill, Needs Review
    gap_priority = Column(String(50), default="Medium")  # Critical, High, Medium, Low
    evidence_confidence = Column(Float, default=0.0)
    explanation = Column(Text, nullable=True)
    recommended_action = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    gap_report = relationship("GapReport", back_populates="gap_items")
    skill = relationship("Skill")
    learning_progress = relationship("LearningProgress", back_populates="gap_item")

class LearningResource(Base):
    __tablename__ = "learning_resources"
    
    id = Column(Integer, primary_key=True, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    provider = Column(String(100), nullable=False)  # Coursera, MDN, Kaggle, freeCodeCamp, Official Docs
    resource_url = Column(String(512), nullable=False)
    resource_type = Column(String(50), default="Tutorial")  # Tutorial, Course, Project Guide, Documentation
    difficulty_level = Column(String(50), default="Beginner")  # Beginner, Intermediate, Advanced
    estimated_effort = Column(String(50), default="10-15 hours")
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    skill = relationship("Skill", back_populates="learning_resources")
    learning_progress = relationship("LearningProgress", back_populates="learning_resource")

class LearningProgress(Base):
    __tablename__ = "learning_progress"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    gap_item_id = Column(Integer, ForeignKey("gap_items.id", ondelete="SET NULL"), nullable=True, index=True)
    learning_resource_id = Column(Integer, ForeignKey("learning_resources.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(50), default="Not Started")  # Not Started, In Progress, Completed
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    user_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="learning_progress")
    gap_item = relationship("GapItem", back_populates="learning_progress")
    learning_resource = relationship("LearningResource", back_populates="learning_progress")

class ResumeSimulation(Base):
    __tablename__ = "resume_simulations"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    base_analysis_id = Column(Integer, ForeignKey("resume_analyses.id", ondelete="CASCADE"), nullable=False, index=True)
    simulated_changes = Column(Text, nullable=False)  # JSON payload of hypothetical projects/certs
    simulated_results = Column(Text, nullable=False)  # JSON payload of simulated scores and changes
    is_simulation = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="simulations")
    base_analysis = relationship("ResumeAnalysis", back_populates="simulations")

class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    technologies = Column(String(500), nullable=True)
    completion_status = Column(String(50), default="In Progress")  # In Progress, Completed
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="projects")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    event_type = Column(String(100), nullable=False)
    resource_type = Column(String(50), nullable=False)
    resource_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    # Relationships
    user = relationship("User", back_populates="audit_events")
