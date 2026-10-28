import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useActiveEvaluation } from '../context/ActiveEvaluationContext';
import { GapItem } from '../types';
import {
  AlertTriangle, Filter, Search, ArrowRight,
  RefreshCw, CheckCircle2, Clock, Compass, HelpCircle, Target
} from 'lucide-react';

export const GapsPage: React.FC = () => {
  const navigate = useNavigate();
  const { activeGapReportId, activeAnalysisId, targetTitle, setActiveEvaluation } = useActiveEvaluation();
  const [items, setItems] = useState<GapItem[]>([]);
  const [reportTitle, setReportTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPriority, setSelectedPriority] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchGaps = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. If activeGapReportId exists, fetch items for that report
      if (activeGapReportId) {
        try {
          const gapItems = await api.getGapItems(activeGapReportId);
          if (gapItems && gapItems.length > 0) {
            setItems(gapItems);
            setReportTitle(targetTitle || 'Target Role');
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to latest
        }
      }

      // 2. Otherwise determine analysisId
      let currentAnalysisId = activeAnalysisId;
      if (!currentAnalysisId) {
        const resumes = await api.listResumes();
        if (resumes.length > 0 && resumes[0].latest_analysis_id) {
          currentAnalysisId = resumes[0].latest_analysis_id;
        }
      }

      // 3. If we have an analysisId, get latest gap report
      if (currentAnalysisId) {
        try {
          const latestReport = await api.getLatestGapReportForAnalysis(currentAnalysisId);
          if (latestReport) {
            setItems(latestReport.gap_items || []);
            setActiveEvaluation(latestReport);
            setReportTitle(latestReport.job_role_title || 'Target Role');
            setLoading(false);
            return;
          }
        } catch {
          // No report found
        }
      }

      // 4. Do not auto-create Junior Data Analyst!
      setItems([]);
      setReportTitle(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load skill gaps.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGaps();
  }, [activeGapReportId, activeAnalysisId]);

  const priorities = ['All', 'Critical', 'High', 'Medium', 'Low'];

  const filteredItems = items.filter((item) => {
    const matchesPriority = selectedPriority === 'All' || item.gap_priority === selectedPriority;
    const matchesSearch = item.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-navy-900">Prioritized Skill Gap Analysis</h2>
            {reportTitle && (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full text-[11px] font-bold">
                {reportTitle}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Missing and weakly supported skills ranked by criticality, requirement weight, and estimated effort
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/jobs"
            className="px-3.5 py-2 bg-white border border-border-subtle hover:bg-gray-50 text-navy-900 font-bold rounded-lg text-xs transition-all"
          >
            Change Target Role
          </Link>
          <Link
            to="/roadmap"
            className="px-4 py-2 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs shadow-sm transition-all flex items-center space-x-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>View Upskilling Roadmap</span>
          </Link>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search gaps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-emerald"
          />
        </div>

        {/* Priority Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() => setSelectedPriority(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedPriority === p
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Gaps Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald animate-spin" />
          <span className="text-xs text-text-secondary">Analyzing requirement gaps...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="max-w-xl mx-auto p-12 bg-white rounded-2xl border border-border-subtle text-center space-y-4 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-emerald mx-auto" />
          <h3 className="text-lg font-bold text-navy-900">No Target Job Evaluated Yet</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            Please select a target role or paste a job description to discover and prioritize your skill gaps.
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald text-navy-950 font-bold rounded-lg text-xs"
          >
            <span>Select Target Role</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-border-subtle text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald mx-auto" />
          <h3 className="text-sm font-bold text-navy-900">No skill gaps found for this filter</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            All evaluated skills have sufficient evidence coverage or do not match the selected priority.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-primary">
              <thead className="bg-gray-50 border-b border-border-subtle text-text-secondary font-semibold">
                <tr>
                  <th className="p-3.5">Skill & Category</th>
                  <th className="p-3.5">Requirement</th>
                  <th className="p-3.5">Candidate Status</th>
                  <th className="p-3.5">Resume Evidence (Heuristic)</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Reason & Action</th>
                  <th className="p-3.5 text-right">Roadmap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredItems.map((item) => {
                  const isCrit = item.gap_priority === 'Critical';
                  const isHigh = item.gap_priority === 'High';
                  const isMed = item.gap_priority === 'Medium';

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-navy-900 block">{item.canonical_name}</span>
                        <span className="text-[10px] text-text-secondary">{item.category}</span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.requirement_type === 'Required' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                        }`}>
                          {item.requirement_type}
                        </span>
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.candidate_status === 'Strong Match' ? 'bg-emerald-50 text-emerald-800' :
                          item.candidate_status === 'Partial Match' ? 'bg-blue-50 text-blue-800' :
                          item.candidate_status === 'Claimed Match' ? 'bg-amber-50 text-amber-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.candidate_status}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold">
                        {item.evidence_confidence > 0 ? `${item.evidence_confidence}%` : '0%'}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold inline-flex items-center space-x-1 ${
                          isCrit ? 'bg-red-100 text-red-800 border border-red-200' :
                          isHigh ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          isMed ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          <span>{item.gap_priority}</span>
                        </span>
                      </td>

                      <td className="p-3.5 max-w-sm">
                        <p className="text-text-primary">{item.explanation}</p>
                        <p className="text-[11px] text-emerald-800 font-medium mt-0.5">
                          👉 {item.recommended_action}
                        </p>
                      </td>

                      <td className="p-3.5 text-right">
                        <Link
                          to="/roadmap"
                          className="px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded text-xs transition-colors inline-flex items-center space-x-1"
                        >
                          <span>Plan</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
