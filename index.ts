export interface User {
  id: number;
  full_name: string;
  email: string;
  role: 'candidate' | 'admin';
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Resume {
  id: number;
  user_id: number;
  original_filename: string;
  file_type: string;
  processing_status: string;
  created_at: string;
  has_analysis: boolean;
  latest_analysis_id?: number | null;
}

export interface SkillEvidence {
  id: number;
  evidence_type: string;
  source_section: string;
  evidence_text: string;
  evidence_strength: number;
  explanation?: string;
  verification_status: string;
  created_at: string;
}

export interface ResumeSkill {
  id: number;
  skill_id: number;
  canonical_name: string;
  category: string;
  original_text: string;
  section_name: string;
  extraction_confidence: number;
  evidence_classification: 'Evidence-Backed Skill' | 'Claimed Skill' | 'Weakly Supported Skill' | 'Verified Skill';
  evidence_confidence: number;
  evidence_records: SkillEvidence[];
  created_at: string;
}

export interface ResumeAnalysis {
  id: number;
  resume_id: number;
  user_id: number;
  analysis_version: number;
  overall_status: string;
  extracted_profile?: {
    candidate_name?: string;
    email?: string;
    phone?: string;
    summary?: string;
    sections?: Record<string, string>;
    total_skills_found?: number;
  };
  skills: ResumeSkill[];
  skill_proof_score: number;
  created_at: string;
}

export interface JobRoleSkill {
  skill_id: number;
  canonical_name: string;
  category: string;
  requirement_type: 'Required' | 'Preferred';
  importance_weight: number;
  minimum_proficiency: string;
}

export interface JobRole {
  id: number;
  title: string;
  description?: string;
  is_custom: boolean;
  skills: JobRoleSkill[];
  created_at: string;
}

export interface GapItem {
  id: number;
  skill_id: number;
  canonical_name: string;
  category: string;
  requirement_type: 'Required' | 'Preferred';
  candidate_status: 'Strong Match' | 'Partial Match' | 'Claimed Match' | 'Missing Skill' | 'Needs Review';
  gap_priority: 'Critical' | 'High' | 'Medium' | 'Low';
  evidence_confidence: number;
  explanation?: string;
  recommended_action?: string;
  supporting_excerpts: string[];
}

export interface ReadinessScoreBreakdown {
  overall_score: number;
  scoring_formula: string;
  total_requirements: number;
  strong_matches_count: number;
  partial_matches_count: number;
  claimed_matches_count: number;
  missing_count: number;
  positive_factors: string[];
  negative_factors: string[];
  limitations_disclaimer: string;
}

export interface GapReport {
  id: number;
  analysis_id: number;
  job_role_id?: number | null;
  job_role_title?: string | null;
  job_description_id?: number | null;
  readiness_score: number;
  skill_proof_score: number;
  scoring_version: string;
  score_breakdown?: ReadinessScoreBreakdown;
  gap_items: GapItem[];
  created_at: string;
}

export interface LearningResource {
  id: number;
  skill_id: number;
  title: string;
  provider: string;
  resource_url: string;
  resource_type: string;
  difficulty_level: string;
  estimated_effort: string;
  description?: string;
}

export interface RoadmapStep {
  step_number: number;
  title: string;
  action_type: string;
  description: string;
  estimated_time: string;
  milestone_outcome: string;
}

export interface SkillRoadmap {
  skill_id: number;
  canonical_name: string;
  category: string;
  gap_priority: string;
  requirement_type: string;
  current_evidence_score: number;
  steps: RoadmapStep[];
  resources: LearningResource[];
}

export interface LearningProgress {
  id: number;
  user_id: number;
  gap_item_id?: number | null;
  learning_resource_id: number;
  resource_title: string;
  skill_name: string;
  status: 'Not Started' | 'In Progress' | 'Completed';
  started_at?: string;
  completed_at?: string;
  user_notes?: string;
  created_at: string;
}

export interface SimulationEffect {
  skill_name: string;
  previous_classification: string;
  simulated_classification: string;
  previous_confidence: number;
  simulated_confidence: number;
  status_upgrade: string;
}

export interface SimulationResponse {
  id: number;
  base_analysis_id: number;
  original_readiness_score: number;
  simulated_readiness_score: number;
  score_delta: number;
  original_proof_score: number;
  simulated_proof_score: number;
  proof_delta: number;
  simulated_skill_effects: SimulationEffect[];
  disclaimer: string;
  created_at: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  category?: string;
  score?: number;
  status?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight: number;
  type: string;
}

export interface EvidenceGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  gap_report_id?: number | null;
  target_role?: string | null;
}

export interface ActiveEvaluation {
  analysisId: number;
  gapReportId: number;
  jobRoleId?: number | null;
  jobDescriptionId?: number | null;
  targetTitle: string;
  targetType: 'predefined_role' | 'saved_job_description' | 'custom_job_description';
}

export interface DashboardSummary {
  latest_readiness_score?: number | null;
  latest_proof_score?: number | null;
  extracted_skills_count: number;
  evidence_backed_count: number;
  weakly_supported_count: number;
  claimed_only_count: number;
  gaps_count: number;
  learning_in_progress_count: number;
  recent_analyses: {
    analysis_id: number;
    resume_filename: string;
    version: number;
    readiness_score?: number | null;
    created_at: string;
  }[];
  top_demonstrated_skills: {
    skill_name: string;
    category: string;
    classification: string;
    confidence: number;
    section: string;
  }[];
  skills_needing_evidence: {
    skill_name: string;
    category: string;
    classification: string;
    confidence: number;
    section: string;
  }[];
  highest_priority_gaps: {
    skill_name: string;
    category: string;
    requirement_type: string;
    gap_priority: string;
    evidence_confidence: number;
    recommended_action: string;
  }[];
  recommended_next_action?: string;
}

export interface ComparisonReport {
  analysis_id_old: number;
  analysis_id_new: number;
  old_date: string;
  new_date: string;
  readiness_old: number;
  readiness_new: number;
  readiness_delta: number;
  proof_old: number;
  proof_new: number;
  proof_delta: number;
  newly_identified_skills: string[];
  skills_with_stronger_evidence: {
    skill_name: string;
    old_confidence: number;
    new_confidence: number;
    delta: number;
    old_classification: string;
    new_classification: string;
  }[];
  resolved_gaps: string[];
  remaining_gaps: string[];
  summary_explanation: string;
}

export interface AdminStats {
  total_users: number;
  total_resumes: number;
  total_analyses: number;
  total_gap_reports: number;
  total_skills_in_taxonomy: number;
  total_job_roles: number;
  total_learning_resources: number;
  active_learning_tasks: number;
}
