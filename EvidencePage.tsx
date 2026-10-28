import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { ResumeSkill } from '../types';
import {
  ShieldCheck, AlertCircle, FileText, CheckCircle2,
  HelpCircle, RefreshCw, Sparkles, Layers, Info
} from 'lucide-react';

export const EvidencePage: React.FC = () => {
  const [skills, setSkills] = useState<ResumeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSkill, setSelectedSkill] = useState<ResumeSkill | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const resumes = await api.listResumes();
      if (!resumes.length) {
        setSkills([]);
        setLoading(false);
        return;
      }
      const latest = resumes[0];
      const analysisId = latest.latest_analysis_id;
      if (analysisId) {
        const skillsData = await api.getAnalysisSkills(analysisId);
        setSkills(skillsData);
        if (skillsData.length > 0) {
          setSelectedSkill(skillsData[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load evidence records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvidence();
  }, []);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-900">Skill Evidence Extraction & Proof Analysis</h2>
        <p className="text-xs text-text-secondary mt-1">
          Traceable evidence excerpts, contextual boosters, and explainable resume confidence scores
        </p>
      </div>

      {/* Methodology Disclaimer Banner */}
      <div className="p-4 bg-navy-900 text-white rounded-2xl shadow-md border border-navy-800 flex items-start space-x-3 text-xs leading-relaxed">
        <Info className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-emerald">Explainability Principle:</span>{' '}
          Scores represent a <span className="underline">resume evidence confidence score</span> based strictly on documented projects, metrics, and certifications. They do not certify human competence or guarantee employment.
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald animate-spin" />
          <span className="text-xs text-text-secondary">Evaluating resume sentence evidence...</span>
        </div>
      ) : skills.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-border-subtle text-center">
          <p className="text-xs text-text-secondary">No analyzed skills available. Upload or analyze a resume first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Skill Selector List */}
          <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden flex flex-col h-[650px]">
            <div className="p-4 border-b border-border-subtle font-bold text-xs text-navy-900 flex justify-between items-center">
              <span>Extracted Skills ({skills.length})</span>
              <span className="text-[10px] text-text-secondary">Select to inspect</span>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border-subtle">
              {skills.map((s) => {
                const isSelected = selectedSkill?.id === s.id;
                const isBacked = s.evidence_classification === 'Evidence-Backed Skill';
                return (
                  <button
                    key={s.id}
                    onClick={() => setSelectedSkill(s)}
                    className={`w-full p-3.5 text-left flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-emerald-50 border-l-4 border-emerald' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold text-navy-900 block">{s.canonical_name}</span>
                      <span className="text-[10px] text-text-secondary">{s.category}</span>
                    </div>

                    <div className="text-right">
                      <span className={`text-[11px] font-bold block ${isBacked ? 'text-emerald' : 'text-amber-600'}`}>
                        {s.evidence_confidence}%
                      </span>
                      <span className="text-[9px] text-text-secondary block">Confidence</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Evidence Inspector Detail */}
          <div className="lg:col-span-2 space-y-4">
            {selectedSkill ? (
              <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
                {/* Top Skill Overview */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border-subtle gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-2xl font-extrabold text-navy-900">{selectedSkill.canonical_name}</h3>
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                        selectedSkill.evidence_classification === 'Evidence-Backed Skill'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : selectedSkill.evidence_classification === 'Weakly Supported Skill'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedSkill.evidence_classification}
                      </span>
                    </div>
                    <span className="text-xs text-text-secondary mt-0.5 block">{selectedSkill.category}</span>
                  </div>

                  <div className="flex items-center space-x-3 bg-gray-50 p-2.5 rounded-xl border border-border-subtle">
                    <div className="text-right">
                      <span className="text-[10px] text-text-secondary block font-semibold uppercase tracking-wider">Confidence Score</span>
                      <span className="text-xl font-extrabold text-navy-900">{selectedSkill.evidence_confidence}/100</span>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-emerald flex items-center justify-center font-bold text-navy-950 text-base">
                      {Math.round(selectedSkill.evidence_confidence)}
                    </div>
                  </div>
                </div>

                {/* Supporting Excerpts Found in Resume */}
                <div className="space-y-3">
                  <span className="text-xs font-bold text-navy-900 block uppercase tracking-wider">
                    Traceable Supporting Excerpts from Resume ({selectedSkill.evidence_records.length})
                  </span>

                  {selectedSkill.evidence_records.length === 0 ? (
                    <p className="text-xs text-text-secondary italic">No direct context sentence identified in resume text.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedSkill.evidence_records.map((ev, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-border-subtle space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="px-2 py-0.5 bg-navy-900 text-white font-bold rounded">
                              Source: {ev.evidence_type}
                            </span>
                            <span className="text-text-secondary">Section: {ev.source_section}</span>
                          </div>

                          <p className="text-xs font-mono text-navy-950 bg-white p-3 rounded-lg border border-border-subtle leading-relaxed">
                            "{ev.evidence_text}"
                          </p>

                          {ev.explanation && (
                            <p className="text-[11px] text-emerald-800 font-medium">
                              💡 {ev.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Score Contributing Factor Weights */}
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-emerald" />
                    <span>How This Score Was Calculated</span>
                  </h4>
                  <p className="text-xs text-emerald-900 leading-relaxed">
                    Based on initial design weights: Practical Projects (40 pts), Work Experience (35 pts), Certifications (20 pts), Coursework (10 pts), Skill list mentions (5 pts), corroborated by action verbs (+15 pts) and measurable metrics (+15 pts).
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
