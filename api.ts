import {
  AuthResponse, User, Resume, ResumeAnalysis, ResumeSkill,
  SkillEvidence, JobRole, GapReport, GapItem, LearningResource,
  SkillRoadmap, LearningProgress, SimulationResponse, EvidenceGraph,
  DashboardSummary, ComparisonReport, AdminStats
} from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  public setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  public clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return !!this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Clear token on unauthorized if not on auth routes
      if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
        this.clearToken();
        window.location.href = '/login';
      }
    }

    if (!response.ok) {
      let errorMessage = 'An error occurred during API request';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorData.message || errorMessage;
      } catch {
        errorMessage = response.statusText;
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // ----------------- Auth -----------------
  async login(credentials: { email: string; password: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    this.setToken(res.access_token);
    return res;
  }

  async register(data: { full_name: string; email: string; password: string; role?: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    this.setToken(res.access_token);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearToken();
    }
  }

  async getMe(): Promise<User> {
    return this.request<User>('/auth/me');
  }

  // ----------------- Resumes -----------------
  async listResumes(): Promise<Resume[]> {
    return this.request<Resume[]>('/resumes');
  }

  async getResume(id: number): Promise<Resume> {
    return this.request<Resume>(`/resumes/${id}`);
  }

  async uploadResume(file: File): Promise<Resume> {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<Resume>('/resumes/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async loadDemoResume(): Promise<Resume> {
    return this.request<Resume>('/resumes/load-demo', { method: 'POST' });
  }

  async loadDemoPhotoResume(): Promise<Resume> {
    return this.request<Resume>('/resumes/load-demo-photo', { method: 'POST' });
  }

  async deleteResume(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/resumes/${id}`, { method: 'DELETE' });
  }

  // ----------------- Analyses -----------------
  async analyzeResume(resumeId: number): Promise<ResumeAnalysis> {
    return this.request<ResumeAnalysis>(`/resumes/${resumeId}/analyze`, { method: 'POST' });
  }

  async getAnalysis(analysisId: number): Promise<ResumeAnalysis> {
    return this.request<ResumeAnalysis>(`/analyses/${analysisId}`);
  }

  async getAnalysisSkills(analysisId: number): Promise<ResumeSkill[]> {
    return this.request<ResumeSkill[]>(`/analyses/${analysisId}/skills`);
  }

  async getAnalysisEvidence(analysisId: number): Promise<SkillEvidence[]> {
    return this.request<SkillEvidence[]>(`/analyses/${analysisId}/evidence`);
  }

  // ----------------- Jobs & Matching -----------------
  async listJobRoles(): Promise<JobRole[]> {
    return this.request<JobRole[]>('/job-roles');
  }

  async getJobRole(id: number): Promise<JobRole> {
    return this.request<JobRole>(`/job-roles/${id}`);
  }

  async analyzeJobDescription(data: { title: string; description_text: string }): Promise<any> {
    return this.request('/job-descriptions/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async matchAnalysis(analysisId: number, payload: { job_role_id?: number; job_description_id?: number; custom_description_text?: string }): Promise<GapReport> {
    return this.request<GapReport>(`/analyses/${analysisId}/match`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getGapReport(reportId: number): Promise<GapReport> {
    return this.request<GapReport>(`/gap-reports/${reportId}`);
  }

  async getLatestGapReportForAnalysis(analysisId: number): Promise<GapReport> {
    return this.request<GapReport>(`/analyses/${analysisId}/gap-reports/latest`);
  }

  async getGapItems(reportId: number): Promise<GapItem[]> {
    return this.request<GapItem[]>(`/gap-reports/${reportId}/items`);
  }

  // ----------------- Learning & Roadmap -----------------
  async getSkillResources(skillId: number): Promise<LearningResource[]> {
    return this.request<LearningResource[]>(`/skills/${skillId}/resources`);
  }

  async getSkillRoadmap(skillId: number): Promise<SkillRoadmap> {
    return this.request<SkillRoadmap>(`/learning/roadmap/${skillId}`);
  }

  async getSkillAssessment(skillName: string): Promise<any> {
    return this.request(`/learning/assessment/${encodeURIComponent(skillName)}`);
  }

  async submitSkillAssessment(payload: { skill_name: string; answers: Record<number, number> }): Promise<any> {
    return this.request('/learning/assessment/submit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async listLearningProgress(): Promise<LearningProgress[]> {
    return this.request<LearningProgress[]>('/learning/progress');
  }

  async startLearningTask(payload: { learning_resource_id: number; gap_item_id?: number; status?: string; user_notes?: string }): Promise<LearningProgress> {
    return this.request<LearningProgress>('/learning/progress', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateLearningProgress(progressId: number, payload: { status: string; user_notes?: string }): Promise<LearningProgress> {
    return this.request<LearningProgress>(`/learning/progress/${progressId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // ----------------- Simulation -----------------
  async runSimulation(payload: {
    analysis_id: number;
    job_role_id?: number;
    simulated_changes: {
      skill_name: string;
      change_type: string;
      title: string;
      description: string;
      technologies: string[];
      outcomes?: string;
    }[];
  }): Promise<SimulationResponse> {
    return this.request<SimulationResponse>('/simulations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // ----------------- Dashboard & History -----------------
  async getDashboard(): Promise<DashboardSummary> {
    return this.request<DashboardSummary>('/dashboard');
  }

  async getAnalysisHistory(): Promise<any[]> {
    return this.request<any[]>('/analysis-history');
  }

  async compareAnalyses(oldId: number, newId: number): Promise<ComparisonReport> {
    return this.request<ComparisonReport>(`/analysis-history/compare?old_id=${oldId}&new_id=${newId}`);
  }

  // ----------------- Graph -----------------
  async getEvidenceGraph(analysisId: number, gapReportId?: number): Promise<EvidenceGraph> {
    const query = gapReportId ? `?gap_report_id=${gapReportId}` : '';
    return this.request<EvidenceGraph>(`/graph/${analysisId}${query}`);
  }

  // ----------------- Admin -----------------
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>('/admin/statistics');
  }

  async adminListUsers(): Promise<{ total_users: number; admin_count: number; candidate_count: number; users: any[] }> {
    return this.request('/admin/users');
  }

  async adminListSkills(): Promise<any[]> {
    return this.request<any[]>('/admin/skills');
  }

  async adminCreateSkill(payload: { canonical_name: string; category: string; description?: string; aliases: string[] }): Promise<any> {
    return this.request('/admin/skills', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async adminDeleteSkill(id: number): Promise<any> {
    return this.request(`/admin/skills/${id}`, { method: 'DELETE' });
  }
}

export const api = new ApiService();
