import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { DashboardSummary } from '../types';
import {
  FileText, Cpu, ShieldCheck, AlertTriangle, TrendingUp,
  ArrowRight, Compass, Sparkles, CheckCircle2, ChevronRight,
  RefreshCw, Award, Info
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const summary = await api.getDashboard();
      setData(summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLoadDemo = async () => {
    setLoading(true);
    try {
      const resume = await api.loadDemoResume();
      await api.analyzeResume(resume.id);
      await fetchDashboard();
    } catch (err: any) {
      setError(err.message || 'Failed to load sample resume.');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald animate-spin" />
        <p className="text-sm text-text-secondary font-medium">Computing evidence metrics...</p>
      </div>
    );
  }

  // Empty State for New Candidate
  const isNewUser = !data || (data.extracted_skills_count === 0 && data.recent_analyses.length === 0);

  if (isNewUser) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-8 rounded-2xl border border-border-subtle shadow-sm text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald flex items-center justify-center mx-auto">
            <FileText className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-navy-900">Welcome to Your Career Readiness Hub</h2>
          <p className="text-sm text-text-secondary max-w-lg mx-auto leading-relaxed">
            You haven't uploaded or analyzed any resumes yet. Upload a PDF or DOCX resume to extract technical and soft skills, associate practical evidence, and identify prioritized gaps against target roles.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/resumes"
              className="px-6 py-2.5 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg shadow-sm transition-all flex items-center space-x-2 text-sm"
            >
              <FileText className="w-4 h-4" />
              <span>Upload My Resume</span>
            </Link>

            <button
              onClick={handleLoadDemo}
              className="px-6 py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-lg transition-all flex items-center space-x-2 text-sm"
            >
              <Sparkles className="w-4 h-4 text-emerald" />
              <span>Load Interactive Demo Resume</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white rounded-xl border border-border-subtle shadow-sm">
            <ShieldCheck className="w-6 h-6 text-emerald mb-2" />
            <h3 className="text-sm font-bold text-navy-900">Evidence Over Claims</h3>
            <p className="text-xs text-text-secondary mt-1">Distinguish between simply listing a skill and proving it through practical projects or work experience.</p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-border-subtle shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-blue-500 mb-2" />
            <h3 className="text-sm font-bold text-navy-900">Explainable Readiness</h3>
            <p className="text-xs text-text-secondary mt-1">See the mathematical formula and factor breakdown behind every readiness percentage.</p>
          </div>

          <div className="p-5 bg-white rounded-xl border border-border-subtle shadow-sm">
            <Compass className="w-6 h-6 text-purple-500 mb-2" />
            <h3 className="text-sm font-bold text-navy-900">7-Step Roadmaps</h3>
            <p className="text-xs text-text-secondary mt-1">Turn gaps into structured learning milestones and project blueprints to update your resume.</p>
          </div>
        </div>
      </div>
    );
  }

  // Chart data for Evidence Distribution
  const pieData = [
    { name: 'Evidence-Backed', value: data.evidence_backed_count, color: '#10B981' },
    { name: 'Weakly Supported', value: data.weakly_supported_count, color: '#F59E0B' },
    { name: 'Claimed Only', value: data.claimed_only_count, color: '#94A3B8' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Action Recommendation Banner */}
      {data.recommended_next_action && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald text-navy-950 flex items-center justify-center flex-shrink-0 font-bold mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide block">Recommended Next Action</span>
              <p className="text-sm text-emerald-950 font-medium mt-0.5">{data.recommended_next_action}</p>
            </div>
          </div>
          <Link
            to="/gaps"
            className="px-3 py-1.5 bg-emerald hover:bg-emerald-600 text-navy-950 text-xs font-bold rounded-lg shadow-sm whitespace-nowrap transition-colors"
          >
            Review Gaps
          </Link>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {/* Readiness Score */}
        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-xs font-semibold">Job Readiness</span>
            <CheckCircle2 className="w-4 h-4 text-emerald" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-navy-900">
              {data.latest_readiness_score !== null && data.latest_readiness_score !== undefined
                ? `${data.latest_readiness_score}%`
                : 'N/A'}
            </span>
            <span className="text-[10px] text-text-secondary block mt-0.5">Weighted Target Match</span>
          </div>
        </div>

        {/* Skill Proof Score */}
        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-xs font-semibold">Skill Proof Score</span>
            <Award className="w-4 h-4 text-emerald" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-emerald">
              {data.latest_proof_score !== null && data.latest_proof_score !== undefined
                ? `${data.latest_proof_score}%`
                : 'N/A'}
            </span>
            <span className="text-[10px] text-text-secondary block mt-0.5">Evidence Density</span>
          </div>
        </div>

        {/* Extracted Skills */}
        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-xs font-semibold">Extracted Skills</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-navy-900">{data.extracted_skills_count}</span>
            <span className="text-[10px] text-text-secondary block mt-0.5">Canonical skills found</span>
          </div>
        </div>

        {/* Evidence-Backed */}
        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-xs font-semibold">Evidence-Backed</span>
            <ShieldCheck className="w-4 h-4 text-emerald" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-navy-900">{data.evidence_backed_count}</span>
            <span className="text-[10px] text-emerald font-semibold block mt-0.5">Projects / Experience</span>
          </div>
        </div>

        {/* Skill Gaps */}
        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-xs font-semibold">Identified Gaps</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-navy-900">{data.gaps_count}</span>
            <span className="text-[10px] text-amber-600 font-semibold block mt-0.5">Need reinforcement</span>
          </div>
        </div>

        {/* Active Learning */}
        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-text-secondary">
            <span className="text-xs font-semibold">In Progress</span>
            <TrendingUp className="w-4 h-4 text-purple-500" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-navy-900">{data.learning_in_progress_count}</span>
            <span className="text-[10px] text-text-secondary block mt-0.5">Active upskilling tasks</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Evidence Breakdown & Priority Gaps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Evidence Strength Chart */}
        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">Skill Evidence Distribution</h3>
            <Link to="/skills" className="text-xs text-emerald font-semibold hover:underline">View All</Link>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value} Skills`, 'Count']} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="pt-2 border-t border-border-subtle text-xs text-text-secondary space-y-1">
            <div className="flex justify-between">
              <span>Evidence-Backed:</span>
              <span className="font-bold text-emerald">{data.evidence_backed_count} skills</span>
            </div>
            <div className="flex justify-between">
              <span>Weakly Supported:</span>
              <span className="font-bold text-amber-500">{data.weakly_supported_count} skills</span>
            </div>
            <div className="flex justify-between">
              <span>Claimed Only:</span>
              <span className="font-bold text-gray-500">{data.claimed_only_count} skills</span>
            </div>
          </div>
        </div>

        {/* Highest Priority Skill Gaps */}
        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-navy-900">Highest-Priority Skill Gaps</h3>
              <p className="text-xs text-text-secondary">Skills requiring urgent project proof or learning to maximize role readiness</p>
            </div>
            <Link to="/gaps" className="text-xs text-emerald font-semibold hover:underline">Full Gap Report</Link>
          </div>

          <div className="space-y-3">
            {data.highest_priority_gaps.length === 0 ? (
              <p className="text-xs text-text-secondary py-6 text-center">No high-priority gaps identified for your target role!</p>
            ) : (
              data.highest_priority_gaps.map((gap, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-gray-50 rounded-xl border border-border-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-navy-900">{gap.skill_name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        gap.gap_priority === 'Critical' ? 'bg-red-100 text-red-700' :
                        gap.gap_priority === 'High' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {gap.gap_priority} Priority
                      </span>
                      <span className="text-[11px] text-text-secondary">({gap.requirement_type})</span>
                    </div>
                    <p className="text-xs text-text-secondary">{gap.recommended_action}</p>
                  </div>

                  <Link
                    to="/roadmap"
                    className="flex-shrink-0 px-3 py-1.5 bg-white hover:bg-emerald hover:text-navy-950 border border-border-subtle rounded-lg text-xs font-bold text-navy-900 transition-all flex items-center space-x-1"
                  >
                    <span>Upskill</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Top Skills & Recent Analyses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Demonstrated Skills */}
        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">Top Demonstrated Skills</h3>
            <Link to="/evidence" className="text-xs text-emerald font-semibold hover:underline">Evidence Log</Link>
          </div>

          <div className="space-y-2.5">
            {data.top_demonstrated_skills.length === 0 ? (
              <p className="text-xs text-text-secondary py-4 text-center">No skills with strong evidence detected yet.</p>
            ) : (
              data.top_demonstrated_skills.map((s, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-navy-900 block">{s.skill_name}</span>
                    <span className="text-[11px] text-text-secondary">Found in: {s.section}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div className="bg-emerald h-1.5 rounded-full" style={{ width: `${s.confidence}%` }}></div>
                    </div>
                    <span className="font-bold text-emerald">{s.confidence}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Analyses & Re-analysis Timeline */}
        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-navy-900">Recent Resume Analyses</h3>
            <Link to="/history" className="text-xs text-emerald font-semibold hover:underline">Compare Reports</Link>
          </div>

          <div className="space-y-2.5">
            {data.recent_analyses.map((a, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-navy-900 block">{a.resume_filename} (v{a.version})</span>
                  <span className="text-[11px] text-text-secondary">{a.created_at}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded border border-emerald-100">
                    {a.readiness_score !== null && a.readiness_score !== undefined ? `${a.readiness_score}% Readiness` : 'Evaluated'}
                  </span>
                  <Link to="/readiness" className="text-text-secondary hover:text-navy-900">
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
