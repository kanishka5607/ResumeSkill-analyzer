from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field

# ----------------- User & Auth -----------------
class UserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)
    role: Optional[str] = "candidate"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    full_name: str
    email: str
    role: str
    created_at: datetime
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# ----------------- Resume & Parsed Profile -----------------
class ResumeResponse(BaseModel):
    id: int
    user_id: int
    original_filename: str
    file_type: str
    processing_status: str
    created_at: datetime
    has_analysis: bool = False
    latest_analysis_id: Optional[int] = None

    class Config:
        from_attributes = True

class ParsedSection(BaseModel):
    heading: str
    raw_content: str
    items: List[str] = []

class ExtractedProfile(BaseModel):
    candidate_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    summary: Optional[str] = None
    sections: Dict[str, str] = {}
    total_skills_found: int = 0

# ----------------- Skills & Evidence -----------------
class SkillBase(BaseModel):
    canonical_name: str
    category: str
    description: Optional[str] = None

class SkillCreate(SkillBase):
    aliases: List[str] = []

class SkillResponse(SkillBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SkillEvidenceResponse(BaseModel):
    id: int
    evidence_type: str
    source_section: str
    evidence_text: str
    evidence_strength: float
    explanation: Optional[str] = None
    verification_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class ResumeSkillResponse(BaseModel):
    id: int
    skill_id: int
    canonical_name: str
    category: str
    original_text: str
    section_name: str
    extraction_confidence: float
    evidence_classification: str
    evidence_confidence: float
    evidence_records: List[SkillEvidenceResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

class ResumeAnalysisResponse(BaseModel):
    id: int
    resume_id: int
    user_id: int
    analysis_version: int
    overall_status: str
    extracted_profile: Optional[Dict[str, Any]] = None
    skills: List[ResumeSkillResponse] = []
    skill_proof_score: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Job Roles & Requirements -----------------
class JobRoleSkillItem(BaseModel):
    skill_id: int
    canonical_name: str
    category: str
    requirement_type: str  # Required, Preferred
    importance_weight: float
    minimum_proficiency: str

class JobRoleCreate(BaseModel):
    title: str
    description: Optional[str] = None
    required_skill_ids: List[int] = []
    preferred_skill_ids: List[int] = []

class JobRoleResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    is_custom: bool
    skills: List[JobRoleSkillItem] = []
    created_at: datetime

    class Config:
        from_attributes = True

class JobDescriptionCreate(BaseModel):
    title: str
    description_text: str

class JobDescriptionResponse(BaseModel):
    id: int
    title: str
    description_text: str
    extracted_requirements: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Matching & Gap Reports -----------------
class MatchRequest(BaseModel):
    job_role_id: Optional[int] = None
    job_description_id: Optional[int] = None
    custom_description_text: Optional[str] = None

class GapItemResponse(BaseModel):
    id: int
    skill_id: int
    canonical_name: str
    category: str
    requirement_type: str
    candidate_status: str
    gap_priority: str
    evidence_confidence: float
    explanation: Optional[str] = None
    recommended_action: Optional[str] = None
    supporting_excerpts: List[str] = []

    class Config:
        from_attributes = True

class ReadinessScoreBreakdown(BaseModel):
    overall_score: float
    scoring_formula: str
    total_requirements: int
    strong_matches_count: int
    partial_matches_count: int
    claimed_matches_count: int
    missing_count: int
    positive_factors: List[str] = []
    negative_factors: List[str] = []
    limitations_disclaimer: str

class GapReportResponse(BaseModel):
    id: int
    analysis_id: int
    job_role_id: Optional[int] = None
    job_role_title: Optional[str] = None
    job_description_id: Optional[int] = None
    readiness_score: float
    skill_proof_score: float
    scoring_version: str
    score_breakdown: Optional[ReadinessScoreBreakdown] = None
    gap_items: List[GapItemResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Learning & Roadmap -----------------
class LearningResourceResponse(BaseModel):
    id: int
    skill_id: int
    title: str
    provider: str
    resource_url: str
    resource_type: str
    difficulty_level: str
    estimated_effort: str
    description: Optional[str] = None

    class Config:
        from_attributes = True

class RoadmapStep(BaseModel):
    step_number: int
    title: str
    action_type: str
    description: str
    estimated_time: str
    milestone_outcome: str

class SkillRoadmap(BaseModel):
    skill_id: int
    canonical_name: str
    category: str
    gap_priority: str
    requirement_type: str
    current_evidence_score: float
    steps: List[RoadmapStep] = []
    resources: List[LearningResourceResponse] = []

class LearningProgressCreate(BaseModel):
    gap_item_id: Optional[int] = None
    learning_resource_id: int
    status: str = "In Progress"
    user_notes: Optional[str] = None

class LearningProgressUpdate(BaseModel):
    status: str
    user_notes: Optional[str] = None

class LearningProgressResponse(BaseModel):
    id: int
    user_id: int
    gap_item_id: Optional[int] = None
    learning_resource_id: int
    resource_title: str
    skill_name: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    user_notes: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# ----------------- Simulation -----------------
class SimulatedChange(BaseModel):
    skill_name: str
    change_type: str  # Project, Certification, Coursework
    title: str
    description: str
    technologies: List[str] = []
    outcomes: Optional[str] = None

class SimulationRequest(BaseModel):
    analysis_id: int
    job_role_id: Optional[int] = None
    simulated_changes: List[SimulatedChange]

class SimulationResponse(BaseModel):
    id: int
    base_analysis_id: int
    original_readiness_score: float
    simulated_readiness_score: float
    score_delta: float
    original_proof_score: float
    simulated_proof_score: float
    simulated_skill_effects: List[Dict[str, Any]]
    disclaimer: str
    created_at: datetime

# ----------------- Graph Visualization -----------------
class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # candidate, skill, project, certification, job_role, gap, learning
    category: Optional[str] = None
    score: Optional[float] = None
    status: Optional[str] = None

class GraphEdge(BaseModel):
    source: str
    target: str
    label: str
    weight: float = 1.0
    type: str

class EvidenceGraphResponse(BaseModel):
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    gap_report_id: Optional[int] = None
    target_role: Optional[str] = None

# ----------------- Dashboard & History -----------------
class DashboardSummary(BaseModel):
    latest_readiness_score: Optional[float] = None
    latest_proof_score: Optional[float] = None
    extracted_skills_count: int = 0
    evidence_backed_count: int = 0
    weakly_supported_count: int = 0
    claimed_only_count: int = 0
    gaps_count: int = 0
    learning_in_progress_count: int = 0
    recent_analyses: List[Dict[str, Any]] = []
    top_demonstrated_skills: List[Dict[str, Any]] = []
    skills_needing_evidence: List[Dict[str, Any]] = []
    highest_priority_gaps: List[Dict[str, Any]] = []
    recommended_next_action: Optional[str] = None

class ComparisonReport(BaseModel):
    analysis_id_old: int
    analysis_id_new: int
    old_date: datetime
    new_date: datetime
    readiness_old: float
    readiness_new: float
    readiness_delta: float
    proof_old: float
    proof_new: float
    proof_delta: float
    newly_identified_skills: List[str] = []
    skills_with_stronger_evidence: List[Dict[str, Any]] = []
    resolved_gaps: List[str] = []
    remaining_gaps: List[str] = []
    summary_explanation: str

# ----------------- Admin -----------------
class AdminStatsResponse(BaseModel):
    total_users: int
    total_resumes: int
    total_analyses: int
    total_gap_reports: int
    total_skills_in_taxonomy: int
    total_job_roles: int
    total_learning_resources: int
    active_learning_tasks: int
