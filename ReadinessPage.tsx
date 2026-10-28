import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useActiveEvaluation } from '../context/ActiveEvaluationContext';
import { GapReport } from '../types';
import {
  CheckCircle2, AlertTriangle, ShieldCheck, Award,
  ArrowRight, RefreshCw, AlertCircle, Info, Sparkles,
  HelpCircle, Target
} from 'lucide-react';

export const ReadinessPage: React.FC = () => {
  const { activeGapReportId, activeAnalysisId, setActiveEvaluation } = useActiveEvaluation();
  const [report, setReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. If activeGapReportId exists, attempt to load that specific gap report
      if (activeGapReportId) {
        try {
          const reportData = await api.getGapReport(activeGapReportId);
          if (reportData) {
            setReport(reportData);
            setLoading(false);
            return;
          }
        } catch {
          // Stale or invalid report ID, continue to fallback
        }
      }

      // 2. Otherwise determine current analysis ID
      let currentAnalysisId = activeAnalysisId;
      if (!currentAnalysisId) {
        const resumes = await api.listResumes();
        if (resumes.length > 0 && resumes[0].latest_analysis_id) {
          currentAnalysisId = resumes[0].latest_analysis_id;
        }
      }

      // 3. If we have an analysis ID, load its latest gap report
      if (currentAnalysisId) {
        try {
          const latestReport = await api.getLatestGapReportForAnalysis(currentAnalysisId);
          if (latestReport) {
            setReport(latestReport);
            setActiveEvaluation(latestReport);
            setLoading(false);
            return;
          }
        } catch {
          // No gap report exists yet for this analysis
        }
      }

      // 4. Do not auto-create Junior Data Analyst. Show clear empty state.
      setReport(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load readiness report.');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeGapReportId, activeAnalysisId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald animate-spin" />
        <p className="text-sm text-text-secondary font-medium">Calculating job readiness and requirement alignment...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-2xl mx-auto p-12 bg-white rounded-2xl border border-border-subtle text-center space-y-4">
        <Target className="w-12 h-12 text-emerald mx-auto" />
        <h3 className="text-lg font-bold text-navy-900">No Job Readiness Evaluation Yet</h3>
        <p className="text-xs text-text-secondary max-w-md mx-auto">
          Please select a target job role or submit a job description to evaluate your resume evidence.
        </p>
        <Link
          to="/jobs"
          className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald text-navy-950 font-bold rounded-lg text-xs"
        >
          <span>Select Target Role</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const breakdown = report.score_breakdown;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-border-subtle gap-4">
        <div>
          <span className="text-xs font-bold text-emerald uppercase tracking-wider block">Target Job Alignment</span>
          <h2 className="text-2xl font-extrabold text-navy-900">{report.job_role_title || 'Target Job Evaluation'}</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            Transparent scoring formula based on resume-based evidence detected in resume text vs role requirements
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            to="/gaps"
            className="px-4 py-2 bg-emerald hover:bg-emerald-600 text-navy-950 text-xs font-bold rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Prioritized Gaps</span>
          </Link>

          <Link
            to="/jobs"
            className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
          >
            Change Target Role
          </Link>
        </div>
      </div>

      {/* Primary KPI Card: Readiness Score & Proof Score */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-navy-900 to-navy-950 text-white p-6 rounded-2xl shadow-xl border border-navy-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-300 font-semibold uppercase tracking-wider">Job Readiness Score</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald animate-ping"></span>
            </div>
            <div className="mt-4 flex items-baseline space-x-2">
              <span className="text-5xl font-black text-white">{report.readiness_score}%</span>
              <span className="text-xs text-emerald font-bold">Readiness Level</span>
            </div>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Calculated using weighted requirement contributions: Strong Match (1.0x), Moderate (0.7x), Claimed (0.3x), Missing (0.0x).
            </p>
          </div>

          <div className="pt-4 border-t border-navy-800 mt-4 flex items-center justify-between text-xs">
            <span className="text-gray-400">Scoring Engine:</span>
            <span className="text-emerald font-mono font-bold">{report.scoring_version}</span>
          </div>
        </div>

        {/* Skill Proof Score Card */}
        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Skill Proof Score</span>
              <Award className="w-4 h-4 text-emerald" />
            </div>
            <div className="mt-4 flex items-baseline space-x-2">
              <span className="text-5xl font-black text-emerald">{report.skill_proof_score}%</span>
              <span className="text-xs text-navy-900 font-bold">Evidence Density</span>
            </div>
            <p className="text-xs text-text-secondary mt-2 leading-relaxed">
              Measures how comprehensively all claimed skills across your entire resume are backed by practical project descriptions in resume text (heuristic evidence, not independently verified).
            </p>
          </div>

          <div className="pt-4 border-t border-border-subtle mt-4 flex items-center justify-between text-xs">
            <span className="text-text-secondary">Distinction:</span>
            <span className="text-navy-900 font-bold">Proof vs. Readiness</span>
          </div>
        </div>

        {/* Match Breakdown Stats */}
        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between">
          <span className="text-xs text-text-secondary font-semibold uppercase tracking-wider">Requirement Matches</span>
          <div className="space-y-2 mt-2">
            <div className="flex justify-between items-center text-xs p-2 bg-emerald-50 text-emerald-900 rounded-lg font-medium">
              <span>Strong Matches:</span>
              <span className="font-bold text-sm">{breakdown?.strong_matches_count || 0}</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-blue-50 text-blue-900 rounded-lg font-medium">
              <span>Partial / Related:</span>
              <span className="font-bold text-sm">{breakdown?.partial_matches_count || 0}</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-amber-50 text-amber-900 rounded-lg font-medium">
              <span>Claimed (No Proof):</span>
              <span className="font-bold text-sm">{breakdown?.claimed_matches_count || 0}</span>
            </div>
            <div className="flex justify-between items-center text-xs p-2 bg-red-50 text-red-900 rounded-lg font-medium">
              <span>Missing Skills:</span>
              <span className="font-bold text-sm">{breakdown?.missing_count || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Transparent Formula & Factors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formula Card */}
        <div className="bg-white p-5 rounded-2xl border border-border-subtle shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-navy-900 flex items-center space-x-1.5 uppercase tracking-wider">
            <Info className="w-4 h-4 text-emerald" />
            <span>Mathematical Formula Breakdown</span>
          </h4>
          <div className="p-3 bg-gray-50 rounded-xl font-mono text-xs text-navy-900 leading-relaxed border border-border-subtle">
            {breakdown?.scoring_formula || 'Readiness Score = (Sum of Weighted Contributions / Sum of Weights) * 100'}
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Required skills are given double importance (2.0x) compared to preferred skills (1.0x). Missing skills contribute 0.0 points, reducing readiness transparently.
          </p>
        </div>

        {/* Positive & Negative Factors */}
        <div className="bg-white p-5 rounded-2xl border border-border-subtle shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
            Key Contributing Factors
          </h4>
          <div className="space-y-1.5">
            {breakdown?.positive_factors.map((p, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-emerald-900">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald flex-shrink-0 mt-0.5" />
                <span>{p}</span>
              </div>
            ))}
            {breakdown?.negative_factors.map((n, idx) => (
              <div key={idx} className="flex items-start space-x-2 text-xs text-red-700">
                <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                <span>{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Requirements Evaluation Table */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-900">Detailed Job Requirement Evaluations ({report.gap_items.length})</h3>
          <span className="text-xs text-text-secondary">Direct vs Related vs Missing alignment</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead className="bg-gray-50 border-b border-border-subtle text-text-secondary font-semibold">
              <tr>
                <th className="p-3.5">Skill Requirement</th>
                <th className="p-3.5">Type</th>
                <th className="p-3.5">Candidate Match Status</th>
                <th className="p-3.5">Resume Evidence (Heuristic)</th>
                <th className="p-3.5">Evaluation & Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {report.gap_items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3.5 font-bold text-navy-900">
                    {item.canonical_name}
                    <span className="text-[10px] text-text-secondary font-normal block">{item.category}</span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.requirement_type === 'Required' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {item.requirement_type}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      item.candidate_status === 'Strong Match' ? 'bg-emerald-100 text-emerald-900' :
                      item.candidate_status === 'Partial Match' ? 'bg-blue-100 text-blue-900' :
                      item.candidate_status === 'Claimed Match' ? 'bg-amber-100 text-amber-900' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {item.candidate_status}
                    </span>
                  </td>
                  <td className="p-3.5 font-bold">
                    {item.evidence_confidence > 0 ? `${item.evidence_confidence}%` : '0%'}
                  </td>
                  <td className="p-3.5 max-w-md">
                    <p className="text-text-primary font-medium">{item.explanation}</p>
                    <p className="text-[11px] text-emerald-800 mt-0.5">👉 {item.recommended_action}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
