import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useActiveEvaluation } from '../context/ActiveEvaluationContext';
import { GapItem, SkillRoadmap, LearningResource } from '../types';
import {
  Compass, BookOpen, Code, FileCheck, CheckCircle2,
  ExternalLink, ArrowRight, RefreshCw, Layers, Sparkles,
  HelpCircle, Award, Check, X, AlertCircle, ChevronRight,
  TrendingUp, GraduationCap, ArrowUpRight, Flame
} from 'lucide-react';

export const RoadmapPage: React.FC = () => {
  const [gaps, setGaps] = useState<GapItem[]>([]);
  const [selectedSkillId, setSelectedSkillId] = useState<number | null>(null);
  const [roadmap, setRoadmap] = useState<SkillRoadmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoadmap, setLoadingRoadmap] = useState(false);
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const [trackedSuccess, setTrackedSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Assessment / Quiz State
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [quizData, setQuizData] = useState<any | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<any | null>(null);
  const [verifiedSkills, setVerifiedSkills] = useState<Record<string, number>>({}); // skillName -> score

  const { activeGapReportId, activeAnalysisId, targetTitle, setActiveEvaluation } = useActiveEvaluation();
  const [reportTitle, setReportTitle] = useState<string | null>(null);

  const fetchGaps = async () => {
    setLoading(true);
    setError(null);
    try {
      let gapItems: GapItem[] = [];

      // 1. If activeGapReportId is set, fetch items for that gap report
      if (activeGapReportId) {
        try {
          gapItems = await api.getGapItems(activeGapReportId);
          if (gapItems && gapItems.length > 0) {
            setGaps(gapItems);
            setReportTitle(targetTitle || 'Target Role');
            setSelectedSkillId(gapItems[0].skill_id);
            await loadRoadmap(gapItems[0].skill_id);
            setLoading(false);
            return;
          }
        } catch {
          // Fallback to latest analysis report
        }
      }

      // 2. Otherwise find current analysis ID
      let currentAnalysisId = activeAnalysisId;
      if (!currentAnalysisId) {
        const resumes = await api.listResumes();
        if (resumes.length > 0 && resumes[0].latest_analysis_id) {
          currentAnalysisId = resumes[0].latest_analysis_id;
        }
      }

      // 3. If analysisId exists, get latest gap report
      if (currentAnalysisId) {
        try {
          const latestReport = await api.getLatestGapReportForAnalysis(currentAnalysisId);
          if (latestReport) {
            gapItems = latestReport.gap_items || [];
            setActiveEvaluation(latestReport);
            setGaps(gapItems);
            setReportTitle(latestReport.job_role_title || 'Target Role');
            if (gapItems.length > 0) {
              setSelectedSkillId(gapItems[0].skill_id);
              await loadRoadmap(gapItems[0].skill_id);
            }
            setLoading(false);
            return;
          }
        } catch {
          // No report
        }
      }

      // 4. Do not auto-create Junior Data Analyst!
      setGaps([]);
      setRoadmap(null);
      setReportTitle(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load roadmap.');
      setGaps([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRoadmap = async (skillId: number) => {
    setLoadingRoadmap(true);
    try {
      const data = await api.getSkillRoadmap(skillId);
      setRoadmap(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load skill roadmap.');
    } finally {
      setLoadingRoadmap(false);
    }
  };

  useEffect(() => {
    fetchGaps();
  }, [activeGapReportId, activeAnalysisId]);

  const handleSelectSkill = async (skillId: number) => {
    setSelectedSkillId(skillId);
    await loadRoadmap(skillId);
    setQuizResult(null);
  };

  const handleTrackResource = async (res: LearningResource) => {
    setTrackingId(res.id);
    setTrackedSuccess(null);
    try {
      await api.startLearningTask({
        learning_resource_id: res.id,
        status: 'In Progress',
        user_notes: `Enrolled via 7-step roadmap for ${roadmap?.canonical_name}`,
      });
      setTrackedSuccess(`Enrolled in "${res.title}"! Tracked in your learning progress.`);
    } catch (err: any) {
      setError(err.message || 'Failed to enroll in learning resource.');
    } finally {
      setTrackingId(null);
    }
  };

  // Start Assessment Quiz
  const handleStartAssessment = async () => {
    if (!roadmap) return;
    setQuizLoading(true);
    setShowQuizModal(true);
    setCurrentQIndex(0);
    setSelectedAnswers({});
    setQuizResult(null);

    try {
      const data = await api.getSkillAssessment(roadmap.canonical_name);
      setQuizData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load skill assessment.');
      setShowQuizModal(false);
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectOption = (questionId: number, optionIndex: number) => {
    if (quizResult) return; // Prevent changing after submission
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!roadmap || !quizData) return;
    setSubmittingQuiz(true);
    try {
      const result = await api.submitSkillAssessment({
        skill_name: roadmap.canonical_name,
        answers: selectedAnswers
      });
      setQuizResult(result);
      if (result.passed) {
        setVerifiedSkills(prev => ({
          ...prev,
          [roadmap.canonical_name]: result.score_percent
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit assessment.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  const isCurrentSkillVerified = roadmap ? Boolean(verifiedSkills[roadmap.canonical_name]) : false;
  const verifiedScore = roadmap ? verifiedSkills[roadmap.canonical_name] : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-navy-900">Personalized Gap-to-Growth Upskilling Roadmap</h2>
            {reportTitle && (
              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full text-[11px] font-bold">
                {reportTitle}
              </span>
            )}
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Structured 7-step journey + interactive Q&A assessment verification: learn, test, prove, and advance.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Link
            to="/jobs"
            className="px-3 py-2 bg-white border border-border-subtle hover:bg-gray-50 text-navy-900 font-bold rounded-lg text-xs transition-all"
          >
            Change Target Role
          </Link>
          {roadmap && (
            <button
              onClick={handleStartAssessment}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all ${
                isCurrentSkillVerified
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                  : 'bg-navy-900 hover:bg-navy-800 text-white hover:shadow-md'
              }`}
            >
              {isCurrentSkillVerified ? (
                <>
                  <Award className="w-4 h-4 text-emerald-700" />
                  <span>Verified ({verifiedScore}%) — Retake Quiz</span>
                </>
              ) : (
                <>
                  <HelpCircle className="w-4 h-4 text-emerald" />
                  <span>Take Skill Assessment (Q&A Round)</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {trackedSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald flex-shrink-0" />
          <span>{trackedSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald animate-spin" />
          <span className="text-xs text-text-secondary">Generating customized roadmaps...</span>
        </div>
      ) : gaps.length === 0 ? (
        <div className="max-w-xl mx-auto p-12 bg-white rounded-2xl border border-border-subtle text-center space-y-4 shadow-sm">
          <Compass className="w-12 h-12 text-emerald mx-auto" />
          <h3 className="text-lg font-bold text-navy-900">No Target Job Evaluated Yet</h3>
          <p className="text-xs text-text-secondary max-w-md mx-auto">
            Please select a target role or paste a job description on the Target Jobs page to generate your personalized upskilling roadmaps.
          </p>
          <Link
            to="/jobs"
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald text-navy-950 font-bold rounded-lg text-xs"
          >
            <span>Select Target Role</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skill Selector */}
          <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="p-4 border-b border-border-subtle font-bold text-xs text-navy-900 flex justify-between items-center bg-gray-50/50">
              <span>Target Gap Skills ({gaps.length})</span>
              <span className="text-[10px] text-text-secondary">Select to view roadmap</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
              {gaps.map((g) => {
                const isSelected = selectedSkillId === g.skill_id;
                const isVerified = Boolean(verifiedSkills[g.canonical_name]);
                return (
                  <button
                    key={g.id}
                    onClick={() => handleSelectSkill(g.skill_id)}
                    className={`w-full p-3.5 text-left transition-colors flex items-center justify-between ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-bold text-navy-900">{g.canonical_name}</span>
                        {isVerified && (
                          <span className="p-0.5 bg-emerald-100 text-emerald-800 rounded-full" title="Assessment Passed!">
                            <Check className="w-3 h-3 text-emerald-600" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-text-secondary">{g.category}</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        g.gap_priority === 'Critical' ? 'bg-red-100 text-red-800' :
                        g.gap_priority === 'High' ? 'bg-amber-100 text-amber-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {g.gap_priority}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Roadmap Steps & Resources */}
          <div className="lg:col-span-2 space-y-6">
            {loadingRoadmap ? (
              <div className="p-16 bg-white rounded-2xl border border-border-subtle text-center">
                <RefreshCw className="w-6 h-6 text-emerald animate-spin mx-auto" />
                <span className="text-xs text-text-secondary mt-2 block">Loading 7-step sequence...</span>
              </div>
            ) : roadmap ? (
              <div className="space-y-6">
                {/* Roadmap Header Card */}
                <div className="bg-gradient-to-br from-navy-900 via-navy-950 to-slate-900 text-white p-6 rounded-2xl shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 bg-emerald text-navy-950 rounded text-xs font-extrabold uppercase tracking-wider">
                      7-Step Growth Path
                    </span>
                    <span className="px-2.5 py-0.5 bg-white/10 text-gray-200 rounded text-xs font-semibold backdrop-blur-sm">
                      {roadmap.gap_priority} Priority Gap
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-white">{roadmap.canonical_name} Mastery Journey</h3>
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">
                      Complete learning modules ➔ Pass the practical Q&A Assessment ➔ Build an end-to-end project ➔ Document metrics in your resume.
                    </p>
                  </div>

                  {/* Verification Banner */}
                  <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      {isCurrentSkillVerified ? (
                        <div className="flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400 text-emerald-300 rounded-full text-xs font-semibold">
                          <Award className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Knowledge Verified ({verifiedScore}% Score)</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1.5 px-3 py-1 bg-amber-500/20 border border-amber-400 text-amber-300 rounded-full text-xs font-semibold">
                          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                          <span>Assessment Pending (80% Required to Verify)</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleStartAssessment}
                      className="px-3 py-1.5 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs transition-colors flex items-center space-x-1 shadow"
                    >
                      <span>{isCurrentSkillVerified ? 'Review Questions' : 'Start Q&A Assessment'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* What to Study Next Card (Study Progression Path) */}
                <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="w-5 h-5 text-emerald" />
                      <h4 className="text-sm font-bold text-navy-900">
                        Completed {roadmap.canonical_name}? What to Study Next:
                      </h4>
                    </div>
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Progression Chain
                    </span>
                  </div>

                  <p className="text-xs text-text-secondary leading-relaxed">
                    Once you master the fundamentals of <strong>{roadmap.canonical_name}</strong> and pass the Q&A round, advance into these higher-tier specializations to maximize your job readiness:
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {roadmap.canonical_name.toUpperCase() === 'SQL' ? (
                      <>
                        <div className="p-3 bg-slate-50 rounded-xl border border-border-subtle space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy-900">1. Advanced SQL & Window Functions</span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">Intermediate</span>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Master <code>ROW_NUMBER()</code>, <code>RANK()</code>, <code>LEAD()</code>, <code>LAG()</code>, and CTEs (WITH queries) for complex analytics.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-border-subtle space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy-900">2. Query Tuning & Indexing</span>
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">Advanced</span>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Learn B-Tree & Hash indexes, <code>EXPLAIN ANALYZE</code> execution plans, and eliminating full table scans.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-border-subtle space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy-900">3. PostgreSQL / MySQL Architecture</span>
                            <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-1.5 py-0.2 rounded">Advanced</span>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Study ACID transactions, WAL (Write-Ahead Logs), isolation levels, and read-replica scaling.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-border-subtle space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy-900">4. Data Modeling & Star Schemas</span>
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">Advanced</span>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Design fact and dimension tables, normalization (3NF) vs star schemas, and ETL data pipelines.
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="p-3 bg-slate-50 rounded-xl border border-border-subtle space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy-900">1. Advanced {roadmap.canonical_name} Architecture</span>
                            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded">Intermediate</span>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Modular design patterns, dependency injection, and automated testing suites.
                          </p>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-border-subtle space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy-900">2. Performance & Production Tuning</span>
                            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded">Advanced</span>
                          </div>
                          <p className="text-[11px] text-text-secondary">
                            Benchmarking, latency profiling, memory caching, and containerized deployment with Docker.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 7-Step Timeline */}
                <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                      7-Step Milestone Execution Roadmap
                    </h4>
                    <span className="text-[11px] text-text-secondary">Milestone 1 to 7</span>
                  </div>

                  <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border-subtle">
                    {roadmap.steps.map((st) => (
                      <div key={st.step_number} className="flex items-start space-x-4 relative">
                        <div className="w-8 h-8 rounded-full bg-navy-900 text-emerald flex items-center justify-center font-bold text-xs flex-shrink-0 z-10 shadow-sm border border-navy-800">
                          {st.step_number}
                        </div>
                        <div className="flex-1 bg-gray-50/80 hover:bg-gray-50 p-4 rounded-xl border border-border-subtle space-y-1 transition-colors">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-navy-900">{st.title}</span>
                            <span className="text-[10px] text-text-secondary bg-white px-2 py-0.5 rounded border border-border-subtle font-mono">
                              ⏱ {st.estimated_time}
                            </span>
                          </div>
                          <p className="text-xs text-text-secondary leading-relaxed">{st.description}</p>
                          <div className="pt-2 text-[11px] text-emerald-800 font-semibold flex items-center space-x-1">
                            <Sparkles className="w-3 h-3 text-emerald" />
                            <span>Milestone: {st.milestone_outcome}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Curated Learning Resources */}
                <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                    Curated Learning Resources ({roadmap.resources.length})
                  </h4>

                  {roadmap.resources.length === 0 ? (
                    <p className="text-xs text-text-secondary italic">No curated resources currently linked for this specific skill.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roadmap.resources.map((res) => (
                        <div key={res.id} className="p-4 bg-gray-50 rounded-xl border border-border-subtle flex flex-col justify-between space-y-3">
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-text-secondary">
                              <span className="font-semibold text-emerald-800">{res.provider}</span>
                              <span>{res.difficulty_level} • {res.estimated_effort}</span>
                            </div>
                            <h5 className="text-xs font-bold text-navy-900 mt-1">{res.title}</h5>
                            <p className="text-[11px] text-text-secondary mt-1">{res.description}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
                            <a
                              href={res.resource_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-navy-900 font-bold hover:text-emerald transition-colors flex items-center space-x-1"
                            >
                              <span>Open Material</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>

                            <button
                              onClick={() => handleTrackResource(res)}
                              disabled={trackingId === res.id}
                              className="px-2.5 py-1 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold text-[11px] rounded transition-colors"
                            >
                              {trackingId === res.id ? 'Tracking...' : 'Track Progress'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* INTERACTIVE SKILL ASSESSMENT / Q&A ROUND MODAL */}
      {showQuizModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-border-subtle">
            {/* Modal Header */}
            <div className="p-5 bg-navy-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald/20 text-emerald flex items-center justify-center">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {roadmap?.canonical_name} Skill Knowledge Assessment
                  </h3>
                  <p className="text-[11px] text-gray-300">
                    Pass with ≥80% score to unlock skill verification and advance to next study topics
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowQuizModal(false)}
                className="p-1 text-gray-400 hover:text-white rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {quizLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald animate-spin" />
                  <p className="text-xs text-text-secondary">Generating questions & validation criteria...</p>
                </div>
              ) : quizResult ? (
                /* QUIZ RESULT SCREEN */
                <div className="space-y-6">
                  {/* Score Card */}
                  <div className={`p-6 rounded-2xl border text-center space-y-3 ${
                    quizResult.passed
                      ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                      : 'bg-amber-50/80 border-amber-200 text-amber-950'
                  }`}>
                    <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center font-black text-2xl shadow-inner border-2 ${
                      quizResult.passed ? 'bg-emerald text-navy-950 border-emerald-400' : 'bg-amber text-navy-950 border-amber-400'
                    }">
                      {quizResult.score_percent}%
                    </div>

                    <div>
                      <h4 className="text-lg font-black">
                        {quizResult.passed ? '🎉 Assessment Passed! Verified Mastered' : '⚠️ Score Below 80% Threshold'}
                      </h4>
                      <p className="text-xs mt-1 max-w-md mx-auto leading-relaxed">
                        {quizResult.message}
                      </p>
                    </div>

                    {quizResult.passed && (
                      <div className="pt-2">
                        <button
                          onClick={() => setShowQuizModal(false)}
                          className="px-6 py-2.5 bg-emerald hover:bg-emerald-600 text-navy-950 font-extrabold rounded-xl text-xs shadow-md transition-all inline-flex items-center space-x-2"
                        >
                          <CheckCircle2 className="w-4 h-4 text-navy-950" />
                          <span>Mark Verified & Advance to Next Study Topics</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Question-by-Question Explanations */}
                  <div className="space-y-3">
                    <h5 className="text-xs font-bold text-navy-900 uppercase tracking-wider">
                      Detailed Review & Explanations ({quizResult.correct_count}/{quizResult.total_questions} Correct)
                    </h5>

                    {quizResult.question_results?.map((qr: any, idx: number) => (
                      <div key={qr.id} className={`p-4 rounded-xl border text-xs space-y-2 ${
                        qr.is_correct ? 'bg-emerald-50/40 border-emerald-200' : 'bg-red-50/40 border-red-200'
                      }`}>
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-navy-900">
                            Q{idx + 1}: {qr.question}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            qr.is_correct ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {qr.is_correct ? 'Correct' : 'Incorrect'}
                          </span>
                        </div>

                        <p className="text-[11px] text-text-secondary leading-relaxed bg-white p-2.5 rounded-lg border border-border-subtle">
                          <strong>Explanation:</strong> {qr.explanation}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Retake Button if Failed */}
                  {!quizResult.passed && (
                    <div className="text-center pt-2">
                      <button
                        onClick={handleStartAssessment}
                        className="px-5 py-2 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-xl text-xs shadow transition-all inline-flex items-center space-x-2"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Retake Assessment</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : quizData ? (
                /* ACTIVE QUESTIONS FORM */
                <div className="space-y-5">
                  {/* Question Progress Dots */}
                  <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                    <span className="text-xs font-bold text-navy-900">
                      Question {currentQIndex + 1} of {quizData.questions.length}
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {quizData.questions.map((_: any, idx: number) => {
                        const isAnswered = selectedAnswers[quizData.questions[idx].id] !== undefined;
                        const isCurrent = currentQIndex === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => setCurrentQIndex(idx)}
                            className={`w-6 h-6 rounded-full text-[10px] font-bold transition-all ${
                              isCurrent
                                ? 'bg-navy-900 text-emerald ring-2 ring-emerald'
                                : isAnswered
                                ? 'bg-emerald text-navy-950 font-bold'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Current Question */}
                  {(() => {
                    const currentQ = quizData.questions[currentQIndex];
                    if (!currentQ) return null;
                    const selectedOpt = selectedAnswers[currentQ.id];

                    return (
                      <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-border-subtle">
                          <h4 className="text-sm font-bold text-navy-900 leading-snug">
                            {currentQ.question}
                          </h4>
                        </div>

                        {/* Options */}
                        <div className="space-y-2.5">
                          {currentQ.options.map((opt: string, optIdx: number) => {
                            const isSelected = selectedOpt === optIdx;
                            return (
                              <button
                                key={optIdx}
                                onClick={() => handleSelectOption(currentQ.id, optIdx)}
                                className={`w-full p-3.5 rounded-xl border text-left text-xs transition-all flex items-start space-x-3 ${
                                  isSelected
                                    ? 'bg-emerald-50 border-emerald-500 shadow-sm ring-1 ring-emerald'
                                    : 'bg-white hover:bg-gray-50 border-border-subtle'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-bold ${
                                  isSelected
                                    ? 'border-emerald bg-emerald text-navy-950'
                                    : 'border-gray-300 text-gray-500'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </div>
                                <span className={`flex-1 ${isSelected ? 'font-bold text-navy-900' : 'text-text-primary'}`}>
                                  {opt}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}
            </div>

            {/* Modal Footer Controls */}
            {!quizResult && quizData && (
              <div className="p-4 bg-gray-50 border-t border-border-subtle flex items-center justify-between">
                <button
                  onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQIndex === 0}
                  className="px-3.5 py-2 text-xs font-semibold text-navy-900 hover:bg-gray-200 rounded-lg disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>

                <div className="flex items-center space-x-2">
                  {currentQIndex < quizData.questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQIndex(prev => Math.min(quizData.questions.length - 1, prev + 1))}
                      className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-lg text-xs transition-colors"
                    >
                      Next Question
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submittingQuiz || Object.keys(selectedAnswers).length < quizData.questions.length}
                      className="px-5 py-2 bg-emerald hover:bg-emerald-600 text-navy-950 font-extrabold rounded-lg text-xs transition-all disabled:opacity-50 shadow"
                    >
                      {submittingQuiz ? 'Evaluating...' : 'Submit Assessment'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
