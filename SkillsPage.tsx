import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { ResumeSkill } from '../types';
import {
  Cpu, Filter, Search, ArrowRight, ShieldCheck,
  AlertTriangle, HelpCircle, RefreshCw, FileText
} from 'lucide-react';

export const SkillsPage: React.FC = () => {
  const [skills, setSkills] = useState<ResumeSkill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchSkills = async () => {
    setLoading(true);
    try {
      // Fetch latest analysis
      const resumes = await api.listResumes();
      if (!resumes.length) {
        setSkills([]);
        setLoading(false);
        return;
      }
      const latestResume = resumes[0];
      if (latestResume.latest_analysis_id) {
        const skillsData = await api.getAnalysisSkills(latestResume.latest_analysis_id);
        setSkills(skillsData);
      } else {
        const analysis = await api.analyzeResume(latestResume.id);
        setSkills(analysis.skills);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load extracted skills.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSkills();
  }, []);

  const categories = ['All', ...Array.from(new Set(skills.map(s => s.category)))];
  const classifications = ['All', 'Evidence-Backed Skill', 'Weakly Supported Skill', 'Claimed Skill'];

  const filteredSkills = skills.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesClass = selectedClass === 'All' || s.evidence_classification === selectedClass;
    const matchesSearch = s.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.original_text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesClass && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Extracted Skills & Canonical Normalization</h2>
          <p className="text-xs text-text-secondary mt-1">
            Taxonomy-matched skills normalized from aliases and associated with their resume source sections
          </p>
        </div>

        <Link
          to="/evidence"
          className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 self-start"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald" />
          <span>Inspect Supporting Evidence</span>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-border-subtle shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search extracted skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-text-primary focus:outline-none focus:border-emerald"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:border-emerald"
          >
            {categories.map((c) => (
              <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
            ))}
          </select>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs font-medium text-text-primary focus:outline-none focus:border-emerald"
          >
            {classifications.map((cl) => (
              <option key={cl} value={cl}>{cl === 'All' ? 'All Classifications' : cl}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-2">
          <RefreshCw className="w-6 h-6 text-emerald animate-spin" />
          <span className="text-xs text-text-secondary">Extracting skills from parsed resume...</span>
        </div>
      ) : filteredSkills.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-border-subtle text-center space-y-3">
          <Cpu className="w-10 h-10 text-gray-300 mx-auto" />
          <h3 className="text-sm font-bold text-navy-900">No matching skills found</h3>
          <p className="text-xs text-text-secondary max-w-sm mx-auto">
            Try adjusting your search filters or upload a revised resume to extract new technical capabilities.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSkills.map((s) => {
            const isBacked = s.evidence_classification === 'Evidence-Backed Skill';
            const isWeak = s.evidence_classification === 'Weakly Supported Skill';

            return (
              <div
                key={s.id}
                className="bg-white p-5 rounded-2xl border border-border-subtle shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-navy-900">{s.canonical_name}</h4>
                      <span className="text-[11px] text-text-secondary font-medium">{s.category}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isBacked ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                      isWeak ? 'bg-amber-50 text-amber-800 border border-amber-200' :
                      'bg-gray-100 text-gray-700 border border-gray-200'
                    }`}>
                      {s.evidence_classification}
                    </span>
                  </div>

                  <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between text-text-secondary text-[11px]">
                      <span>Matched As:</span>
                      <span className="font-mono text-navy-900 font-semibold">{s.original_text}</span>
                    </div>
                    <div className="flex justify-between text-text-secondary text-[11px]">
                      <span>Primary Section:</span>
                      <span className="text-navy-900 font-medium">{s.section_name}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border-subtle">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-secondary font-medium">Evidence Confidence</span>
                    <span className="font-bold text-navy-900">{s.evidence_confidence}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        isBacked ? 'bg-emerald' : isWeak ? 'bg-amber-500' : 'bg-gray-400'
                      }`}
                      style={{ width: `${s.evidence_confidence}%` }}
                    ></div>
                  </div>

                  <div className="pt-2 flex justify-between items-center">
                    <span className="text-[11px] text-text-secondary">
                      {s.evidence_records.length} evidence source{s.evidence_records.length === 1 ? '' : 's'}
                    </span>
                    <Link
                      to="/evidence"
                      className="text-xs text-emerald font-semibold hover:underline flex items-center space-x-1"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
