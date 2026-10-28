import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useActiveEvaluation } from '../context/ActiveEvaluationContext';
import { JobRole } from '../types';
import {
  Target, Briefcase, FileText, CheckCircle2,
  Sparkles, ArrowRight, RefreshCw, AlertCircle
} from 'lucide-react';

export const JobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { setActiveEvaluation } = useActiveEvaluation();
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [selectedRole, setSelectedRole] = useState<JobRole | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const [parsingJd, setParsingJd] = useState(false);
  const [parsedJdResult, setParsedJdResult] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await api.listJobRoles();
      setRoles(data);
      if (data.length > 0) {
        setSelectedRole(data[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load job roles.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleParseJobDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    setError(null);
    setParsingJd(true);
    try {
      const res = await api.analyzeJobDescription({
        title: customTitle.trim() || 'Custom Job Position',
        description_text: customText,
      });
      setParsedJdResult(res);
    } catch (err: any) {
      setError(err.message || 'Failed to parse job description.');
    } finally {
      setParsingJd(false);
    }
  };

  const handleEvaluate = async (roleId?: number, jdId?: number) => {
    setError(null);
    setEvaluating(true);
    try {
      const resumes = await api.listResumes();
      if (!resumes.length) {
        throw new Error('Please upload or load a resume first before evaluating against a job role.');
      }
      const latest = resumes[0];
      let analysisId = latest.latest_analysis_id;
      if (!analysisId) {
        const analysis = await api.analyzeResume(latest.id);
        analysisId = analysis.id;
      }

      const report = await api.matchAnalysis(analysisId, {
        job_role_id: roleId,
        job_description_id: jdId,
      });

      const matchedRole = roleId ? roles.find(r => r.id === roleId) : null;
      const targetTitle = jdId && parsedJdResult
        ? (parsedJdResult.title || customTitle || 'Custom Job Description')
        : (matchedRole?.title || report.job_role_title || 'Target Job Role');

      const targetType: 'predefined_role' | 'saved_job_description' | 'custom_job_description' = roleId
        ? 'predefined_role'
        : (jdId ? 'saved_job_description' : 'custom_job_description');

      setActiveEvaluation({
        analysisId: report.analysis_id,
        gapReportId: report.id,
        jobRoleId: roleId || report.job_role_id || null,
        jobDescriptionId: jdId || report.job_description_id || null,
        targetTitle,
        targetType,
      });

      navigate('/readiness');
    } catch (err: any) {
      setError(err.message || 'Evaluation failed.');
      setEvaluating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-900">Target Job Role & Requirements Selection</h2>
        <p className="text-xs text-text-secondary mt-1">
          Select an industry standard role template or paste a job description to extract required skills
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tabs / Switcher between Template and Custom JD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Predefined Roles Selector */}
        <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden flex flex-col h-[650px]">
          <div className="p-4 border-b border-border-subtle font-bold text-xs text-navy-900 flex items-center space-x-2">
            <Briefcase className="w-4 h-4 text-emerald" />
            <span>Predefined Role Templates ({roles.length})</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-xs text-text-secondary">Loading roles...</div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
              {roles.map((r) => {
                const isSelected = selectedRole?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => {
                      setSelectedRole(r);
                      setParsedJdResult(null);
                    }}
                    className={`w-full p-3.5 text-left transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-emerald-50 border-l-4 border-emerald' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-navy-900 block">{r.title}</span>
                      <span className="text-[10px] text-text-secondary">
                        {r.skills.filter(s => s.requirement_type === 'Required').length} Required • {r.skills.filter(s => s.requirement_type === 'Preferred').length} Preferred
                      </span>
                    </div>
                    <ArrowRight className={`w-3.5 h-3.5 ${isSelected ? 'text-emerald' : 'text-gray-300'}`} />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Role Viewer or Custom JD Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Predefined Role Card */}
          {selectedRole && !parsedJdResult && (
            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-3">
                <div>
                  <span className="text-[10px] text-emerald font-bold uppercase tracking-wider block">Target Role</span>
                  <h3 className="text-2xl font-extrabold text-navy-900">{selectedRole.title}</h3>
                  <p className="text-xs text-text-secondary mt-1">{selectedRole.description}</p>
                </div>

                <button
                  onClick={() => handleEvaluate(selectedRole.id, undefined)}
                  disabled={evaluating}
                  className="px-5 py-2.5 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-xl text-xs shadow transition-all flex items-center space-x-2 disabled:opacity-50 self-start"
                >
                  {evaluating ? (
                    <span>Evaluating Resume...</span>
                  ) : (
                    <>
                      <span>Evaluate My Resume</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Required Skills */}
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                    Core Required Skills (Weight 2.0x)
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRole.skills.filter(s => s.requirement_type === 'Required').map((s) => (
                    <div
                      key={s.skill_id}
                      className="px-3 py-1.5 bg-gray-50 border border-border-subtle rounded-lg text-xs font-semibold text-navy-900 flex items-center space-x-1.5"
                    >
                      <span>{s.canonical_name}</span>
                      <span className="text-[10px] text-text-secondary font-normal">({s.category})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preferred Skills */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                    Preferred & Bonus Skills (Weight 1.0x)
                  </h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectedRole.skills.filter(s => s.requirement_type === 'Preferred').map((s) => (
                    <div
                      key={s.skill_id}
                      className="px-3 py-1.5 bg-gray-50 border border-border-subtle rounded-lg text-xs font-medium text-navy-900 flex items-center space-x-1.5"
                    >
                      <span>{s.canonical_name}</span>
                      <span className="text-[10px] text-text-secondary">({s.category})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Custom Job Description Parser */}
          <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-navy-900 flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald" />
                <span>Or Paste a Custom Job Description</span>
              </h3>
              <p className="text-xs text-text-secondary mt-1">
                Our NLP parser dynamically identifies required vs preferred technologies and requirements
              </p>
            </div>

            <form onSubmit={handleParseJobDescription} className="space-y-3">
              <input
                type="text"
                placeholder="Job Position Title (e.g. Senior Backend Engineer at Stripe)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-emerald"
              />

              <textarea
                rows={5}
                placeholder="Paste the job posting description with responsibilities and qualifications..."
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="w-full p-3 bg-gray-50 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-emerald"
              ></textarea>

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-text-secondary">Provide at least 30 characters</span>
                <button
                  type="submit"
                  disabled={parsingJd || !customText.trim()}
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-lg text-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {parsingJd ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-emerald" />}
                  <span>Parse Requirements</span>
                </button>
              </div>
            </form>

            {/* Parsed Custom Result */}
            {parsedJdResult && (
              <div className="mt-4 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-navy-900">{parsedJdResult.title}</span>
                    <span className="text-[11px] text-text-secondary block">
                      Found {parsedJdResult.extracted_requirements?.required_skills?.length || 0} required &{' '}
                      {parsedJdResult.extracted_requirements?.preferred_skills?.length || 0} preferred skills
                    </span>
                  </div>
                  <button
                    onClick={() => handleEvaluate(undefined, parsedJdResult.id)}
                    disabled={evaluating}
                    className="px-4 py-2 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs shadow transition-all flex items-center space-x-1"
                  >
                    <span>Evaluate Against This JD</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-2">
                  {parsedJdResult.extracted_requirements?.required_skills?.map((s: any, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-bold">
                      {s.canonical_name} (Req)
                    </span>
                  ))}
                  {parsedJdResult.extracted_requirements?.preferred_skills?.map((s: any, idx: number) => (
                    <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium">
                      {s.canonical_name} (Pref)
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
