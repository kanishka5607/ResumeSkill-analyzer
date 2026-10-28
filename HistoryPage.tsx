import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useActiveEvaluation } from '../context/ActiveEvaluationContext';
import { ComparisonReport } from '../types';
import {
  History, ArrowRight, TrendingUp, CheckCircle2,
  RefreshCw, Layers, Sparkles, X, AlertCircle
} from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveEvaluation } = useActiveEvaluation();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [oldId, setOldId] = useState<number | null>(null);
  const [newId, setNewId] = useState<number | null>(null);
  const [comparison, setComparison] = useState<ComparisonReport | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getAnalysisHistory();
      setHistory(data);
      if (data.length >= 2) {
        setOldId(data[data.length - 1].analysis_id);
        setNewId(data[0].analysis_id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load analysis history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCompare = async () => {
    if (!oldId || !newId) return;
    setError(null);
    setComparing(true);
    try {
      const res = await api.compareAnalyses(oldId, newId);
      setComparison(res);
    } catch (err: any) {
      setError(err.message || 'Failed to compare reports.');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-900">Analysis History & Historical Comparison</h2>
        <p className="text-xs text-text-secondary mt-1">
          Track evidence changes across resume revisions and compare report versions side-by-side
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Comparison Selector Card */}
      {history.length >= 2 && (
        <div className="bg-white p-5 rounded-2xl border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-border-subtle">
            <Sparkles className="w-4 h-4 text-emerald" />
            <h3 className="text-sm font-bold text-navy-900">Version-to-Version Report Comparator</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Baseline Report (Old Version)</label>
              <select
                value={oldId || ''}
                onChange={(e) => setOldId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              >
                {history.map((h) => (
                  <option key={h.analysis_id} value={h.analysis_id}>
                    #{h.analysis_id} • v{h.version} ({new Date(h.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-text-secondary mb-1">Revised Report (New Version)</label>
              <select
                value={newId || ''}
                onChange={(e) => setNewId(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              >
                {history.map((h) => (
                  <option key={h.analysis_id} value={h.analysis_id}>
                    #{h.analysis_id} • v{h.version} ({new Date(h.created_at).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleCompare}
              disabled={comparing || oldId === newId}
              className="w-full py-2 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs shadow-sm transition-all flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              {comparing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <TrendingUp className="w-3.5 h-3.5" />}
              <span>Compare Versions</span>
            </button>
          </div>
        </div>
      )}

      {/* Comparison Modal / Result Card */}
      {comparison && (
        <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <span className="text-xs font-bold text-emerald uppercase tracking-wider">Report Comparison Findings</span>
            <button onClick={() => setComparison(null)} className="text-gray-400 hover:text-navy-900">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 bg-emerald-50 rounded-xl text-xs text-emerald-950 font-medium leading-relaxed border border-emerald-200">
            📊 {comparison.summary_explanation}
          </div>

          {/* Deltas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-border-subtle space-y-1">
              <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider block">Job Readiness Shift</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-navy-900">{comparison.readiness_new}%</span>
                <span className={`text-xs font-bold ${comparison.readiness_delta >= 0 ? 'text-emerald' : 'text-red-500'}`}>
                  {comparison.readiness_delta >= 0 ? `+${comparison.readiness_delta}%` : `${comparison.readiness_delta}%`}
                </span>
              </div>
              <span className="text-[10px] text-text-secondary block">Baseline: {comparison.readiness_old}%</span>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-border-subtle space-y-1">
              <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider block">Skill Proof Score Shift</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald">{comparison.proof_new}%</span>
                <span className={`text-xs font-bold ${comparison.proof_delta >= 0 ? 'text-emerald' : 'text-red-500'}`}>
                  {comparison.proof_delta >= 0 ? `+${comparison.proof_delta}%` : `${comparison.proof_delta}%`}
                </span>
              </div>
              <span className="text-[10px] text-text-secondary block">Baseline: {comparison.proof_old}%</span>
            </div>
          </div>

          {/* Newly Identified & Strengthened Skills */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-gray-50 rounded-xl border border-border-subtle space-y-2">
              <span className="text-xs font-bold text-navy-900 block">Newly Identified Skills ({comparison.newly_identified_skills.length})</span>
              {comparison.newly_identified_skills.length === 0 ? (
                <span className="text-xs text-text-secondary italic">None detected</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {comparison.newly_identified_skills.map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded text-xs font-bold">
                      +{s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-border-subtle space-y-2">
              <span className="text-xs font-bold text-navy-900 block">Resolved Gaps ({comparison.resolved_gaps.length})</span>
              {comparison.resolved_gaps.length === 0 ? (
                <span className="text-xs text-text-secondary italic">None resolved</span>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {comparison.resolved_gaps.map((g, i) => (
                    <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-900 rounded text-xs font-bold">
                      ✓ {g}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historical Analyses Table */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle font-bold text-xs text-navy-900 flex justify-between items-center">
          <span>All Snapshot Reports ({history.length})</span>
          <span className="text-xs text-text-secondary">Immutable historical audit</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-text-secondary">Loading history...</div>
        ) : history.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-secondary">No historical reports found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-primary">
              <thead className="bg-gray-50 border-b border-border-subtle text-text-secondary font-semibold">
                <tr>
                  <th className="p-3.5">Version & File</th>
                  <th className="p-3.5">Target Role</th>
                  <th className="p-3.5">Readiness Score</th>
                  <th className="p-3.5">Proof Score</th>
                  <th className="p-3.5">Extracted Skills</th>
                  <th className="p-3.5">Timestamp</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {history.map((h) => (
                  <tr key={h.analysis_id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3.5 font-bold text-navy-900">
                      {h.resume_filename}
                      <span className="text-[10px] text-text-secondary font-semibold block">Snapshot v{h.version}</span>
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-navy-900">{h.target_title || h.target_role || 'Target Job'}</span>
                        {h.target_type && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-gray-100 text-text-secondary">
                            {h.target_type === 'predefined_role' ? 'Role' : 'JD'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 font-bold rounded">
                        {h.readiness_score !== null && h.readiness_score !== undefined ? `${h.readiness_score}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-emerald">
                      {h.skill_proof_score !== null && h.skill_proof_score !== undefined ? `${h.skill_proof_score}%` : 'N/A'}
                    </td>
                    <td className="p-3.5 text-navy-900 font-semibold">{h.skills_count} skills</td>
                    <td className="p-3.5 text-text-secondary">{new Date(h.created_at).toLocaleString()}</td>
                    <td className="p-3.5 text-right">
                      {h.gap_report_id ? (
                        <button
                          onClick={() => {
                            setActiveEvaluation({
                              analysisId: h.analysis_id,
                              gapReportId: h.gap_report_id,
                              jobRoleId: h.job_role_id,
                              jobDescriptionId: h.job_description_id,
                              targetTitle: h.target_title || h.target_role || 'Target Role',
                              targetType: h.target_type || 'predefined_role',
                            });
                            navigate('/readiness');
                          }}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200 font-bold rounded text-[11px] transition-colors"
                        >
                          View Readiness
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            navigate('/jobs');
                          }}
                          className="px-2.5 py-1 bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 font-medium rounded text-[11px] transition-colors"
                        >
                          Select Role
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
