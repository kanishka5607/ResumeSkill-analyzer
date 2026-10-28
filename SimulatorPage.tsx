import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useActiveEvaluation } from '../context/ActiveEvaluationContext';
import { SimulationResponse, ResumeSkill } from '../types';
import {
  Sparkles, AlertTriangle, ArrowRight, CheckCircle2,
  TrendingUp, RefreshCw, Layers, ShieldAlert, Award
} from 'lucide-react';

export const SimulatorPage: React.FC = () => {
  const { activeEvaluation, activeAnalysisId } = useActiveEvaluation();
  const [skills, setSkills] = useState<ResumeSkill[]>([]);
  const [selectedSkill, setSelectedSkill] = useState<string>('');
  const [changeType, setChangeType] = useState<string>('Project');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [technologies, setTechnologies] = useState<string>('');
  const [outcomes, setOutcomes] = useState<string>('');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analysisId, setAnalysisId] = useState<number | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const resumes = await api.listResumes();
        if (resumes.length > 0 && resumes[0].latest_analysis_id) {
          setAnalysisId(resumes[0].latest_analysis_id);
          const skillsData = await api.getAnalysisSkills(resumes[0].latest_analysis_id);
          setSkills(skillsData);
          if (skillsData.length > 0) {
            setSelectedSkill(skillsData[0].canonical_name);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize simulator.');
      }
    };
    init();
  }, []);

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analysisId) {
      setError('Please analyze a resume first before running simulation.');
      return;
    }
    if (!description.trim() || !title.trim()) {
      setError('Please provide a title and detailed project description.');
      return;
    }

    setError(null);
    setSimulating(true);

    try {
      const techList = technologies.split(',').map(t => t.trim()).filter(Boolean);
      if (selectedSkill && !techList.includes(selectedSkill)) {
        techList.push(selectedSkill);
      }

      const res = await api.runSimulation({
        analysis_id: analysisId,
        job_role_id: activeEvaluation?.jobRoleId || undefined,
        simulated_changes: [{
          skill_name: selectedSkill,
          change_type: changeType,
          title,
          description,
          technologies: techList,
          outcomes,
        }],
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Simulation failed.');
    } finally {
      setSimulating(false);
    }
  };

  const handlePreFillExample = () => {
    setSelectedSkill('SQL');
    setChangeType('Project');
    setTitle('Sales Transaction Insights & Query Optimization Engine');
    setDescription('Architected a relational database schema and built query aggregation pipelines in SQL to process 10,000+ daily orders.');
    setTechnologies('Python, SQL, SQLite');
    setOutcomes('Optimized query execution time by 40% and generated automated monthly revenue reports.');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-navy-900">Resume Improvement Simulator</h2>
        <p className="text-xs text-text-secondary mt-1">
          Explore how proposed capstone projects or certifications would transform your evidence classifications and readiness score
        </p>
      </div>

      {/* Mandatory Safeguard Disclaimer Banner */}
      <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start space-x-3 text-xs text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Essential Safeguard:</span>{' '}
          All simulation output is strictly hypothetical. The original resume remains unchanged in the database.
          <span className="font-semibold block mt-1">
            "Simulation only — add this evidence to your actual resume only after completing the actual work."
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Form on Left, Live Output on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Simulation Builder Form */}
        <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
            <h3 className="text-sm font-bold text-navy-900">Hypothetical Evidence Builder</h3>
            <button
              type="button"
              onClick={handlePreFillExample}
              className="text-xs text-emerald font-semibold hover:underline flex items-center space-x-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fill Practical Example</span>
            </button>
          </div>

          <form onSubmit={handleRunSimulation} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">Target Skill to Upgrade</label>
              <input
                type="text"
                value={selectedSkill}
                onChange={(e) => setSelectedSkill(e.target.value)}
                placeholder="e.g. SQL, Docker, FastAPI"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">Evidence Activity Type</label>
              <select
                value={changeType}
                onChange={(e) => setChangeType(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              >
                <option value="Project">Practical Capstone Project (+40 pts)</option>
                <option value="Experience">Internship / Work Experience (+35 pts)</option>
                <option value="Certification">Formal Certification (+20 pts)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">Project or Credential Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Student Attendance & Analytics System"
                required
                className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">
                Implementation Details (Use Action Verbs)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Engineered record aggregation and automated reporting queries using Python and SQL..."
                required
                className="w-full p-3 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              ></textarea>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">Technologies Paired</label>
              <input
                type="text"
                value={technologies}
                onChange={(e) => setTechnologies(e.target.value)}
                placeholder="Python, SQL, PostgreSQL"
                className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 mb-1">Measurable Impact / Outcomes</label>
              <input
                type="text"
                value={outcomes}
                onChange={(e) => setOutcomes(e.target.value)}
                placeholder="e.g. Processed 10k transactions, reduced query latency by 35%"
                className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              />
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-2.5 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Simulate Readiness Impact</span>
            </button>
          </form>
        </div>

        {/* Live Simulation Results */}
        <div className="space-y-4">
          {result ? (
            <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
                <span className="text-xs font-bold text-emerald uppercase tracking-wider">Simulated Results</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[10px] font-bold rounded border border-emerald-200">
                  Hypothetical
                </span>
              </div>

              {/* Score Shift KPIs */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl border border-border-subtle space-y-1">
                  <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider block">Job Readiness</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-navy-900">{result.simulated_readiness_score}%</span>
                    <span className="text-xs font-bold text-emerald">
                      +{result.score_delta}%
                    </span>
                  </div>
                  <span className="text-[10px] text-text-secondary block">Was {result.original_readiness_score}%</span>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl border border-border-subtle space-y-1">
                  <span className="text-[10px] text-text-secondary font-semibold uppercase tracking-wider block">Skill Proof Score</span>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-emerald">{result.simulated_proof_score}%</span>
                    <span className="text-xs font-bold text-emerald">
                      +{result.proof_delta}%
                    </span>
                  </div>
                  <span className="text-[10px] text-text-secondary block">Was {result.original_proof_score}%</span>
                </div>
              </div>

              {/* Skill Classification Upgrade */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-navy-900 uppercase tracking-wider">Skill Evidence Transformation</h4>
                {result.simulated_skill_effects.map((eff, idx) => (
                  <div key={idx} className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-navy-900">{eff.skill_name}</span>
                      <span className="text-xs font-bold text-emerald">{eff.status_upgrade}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-emerald-900">
                      <span>Confidence Shift:</span>
                      <span className="font-mono font-bold">{eff.previous_confidence}% ➔ {eff.simulated_confidence}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-gray-50 rounded-xl text-xs text-text-secondary leading-relaxed border border-border-subtle">
                💡 <span className="font-semibold text-navy-900">Next Step:</span> Work on this project in your local development environment. Once completed and pushed to GitHub, add these bullet points to your genuine resume and re-analyze to make these improvements permanent!
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-border-subtle text-center space-y-3">
              <Sparkles className="w-10 h-10 text-emerald mx-auto" />
              <h3 className="text-sm font-bold text-navy-900">Simulate Before You Update</h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto leading-relaxed">
                Fill in the hypothetical builder on the left to see how adding specific projects, technologies, and metrics will impact your readiness score and evidence strength.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
