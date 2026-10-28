import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Cpu, ShieldCheck, Target, CheckCircle2,
  AlertTriangle, Compass, ArrowRight, Sparkles, Check,
  Award, Globe2, Layers
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-warm-bg text-text-primary flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-border-subtle bg-white/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald flex items-center justify-center font-bold text-navy-950 text-xl shadow-md">
              R
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-navy-900 block">ResumeEvidence</span>
              <span className="text-[10px] text-emerald font-semibold uppercase tracking-wider block">Skill Proof Platform</span>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-text-secondary">
            <a href="#workflow" className="hover:text-emerald transition-colors">How It Works</a>
            <a href="#features" className="hover:text-emerald transition-colors">Features</a>
            <a href="#sdg8" className="hover:text-emerald transition-colors">SDG 8 Alignment</a>
            <a href="#differentiation" className="hover:text-emerald transition-colors">Why Evidence?</a>
          </nav>

          <div className="flex items-center space-x-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-navy-900 hover:text-emerald transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 bg-emerald hover:bg-emerald-600 text-navy-950 text-sm font-semibold rounded-lg shadow-sm transition-all"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 via-navy-800 to-navy-950 text-white pt-20 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-navy-800 border border-emerald/40 text-emerald text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explainable Career Guidance & Skill Verification</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
            Move beyond skill claims. <br />
            <span className="text-emerald">Build evidence-backed career readiness.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-300 leading-relaxed">
            Traditional tools only match keywords. Our platform extracts technical and soft skills, searches your resume for verifiable project evidence, calculates transparent proof scores, and generates actionable upskilling roadmaps.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto px-6 py-3.5 bg-emerald hover:bg-emerald-600 text-navy-950 text-base font-bold rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
            >
              <span>Analyze Your Resume Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto px-6 py-3.5 bg-navy-800 hover:bg-navy-700 text-white border border-navy-700 text-base font-semibold rounded-xl transition-all"
            >
              Try Interactive Demo
            </Link>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto text-left">
            <div className="bg-navy-800/80 p-4 rounded-xl border border-navy-700/60">
              <span className="text-xs text-gray-400 block font-medium">Core Difference</span>
              <span className="text-base font-bold text-white mt-1 block">Claim vs. Proof</span>
            </div>
            <div className="bg-navy-800/80 p-4 rounded-xl border border-navy-700/60">
              <span className="text-xs text-gray-400 block font-medium">Scoring Engine</span>
              <span className="text-base font-bold text-emerald mt-1 block">Explainable (0-100)</span>
            </div>
            <div className="bg-navy-800/80 p-4 rounded-xl border border-navy-700/60">
              <span className="text-xs text-gray-400 block font-medium">Gap Prioritization</span>
              <span className="text-base font-bold text-white mt-1 block">Critical to Low</span>
            </div>
            <div className="bg-navy-800/80 p-4 rounded-xl border border-navy-700/60">
              <span className="text-xs text-gray-400 block font-medium">Improvement Loop</span>
              <span className="text-base font-bold text-emerald mt-1 block">7-Step Roadmaps</span>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold text-emerald uppercase tracking-wider block mb-2">Integrated Methodology</span>
          <h2 className="text-3xl font-bold text-navy-900">How Evidence-Based Analysis Works</h2>
          <p className="text-text-secondary mt-3 text-sm sm:text-base">
            From raw document parsing to closed-loop career growth — every step is explainable, documented, and traceable to your actual resume text.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { step: '01', title: 'Resume Upload', desc: 'Secure PDF/DOCX ingestion with automated text and section parsing.', icon: FileText },
            { step: '02', title: 'Skill Extraction', desc: 'Normalized canonical skill extraction protected by strict word boundaries.', icon: Cpu },
            { step: '03', title: 'Evidence Analysis', desc: 'Deep sentence search for practical projects, metrics, and certifications.', icon: ShieldCheck },
            { step: '04', title: 'Job Matching', desc: 'Semantic comparison against target job roles and requirement importance.', icon: Target },
            { step: '05', title: 'Gap Prioritization', desc: 'Ranks missing and weakly supported skills from Critical to Low.', icon: AlertTriangle },
            { step: '06', title: 'Upskill & Re-Analyze', desc: 'Actionable 7-step learning roadmaps with genuine evidence tracking.', icon: Compass },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-border-subtle shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow relative">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald flex items-center justify-center font-bold text-xs mb-3">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-text-secondary block">Step {item.step}</span>
                  <h3 className="text-sm font-bold text-navy-900 mt-1">{item.title}</h3>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Unique Differentiation Section */}
      <section id="differentiation" className="py-16 bg-white border-y border-border-subtle px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-xs font-bold text-emerald uppercase tracking-wider block mb-2">Key Differentiation</span>
              <h2 className="text-3xl font-bold text-navy-900 leading-snug">
                The Distinction Between Claimed Skills and Proven Evidence
              </h2>
              <p className="text-text-secondary mt-4 text-sm leading-relaxed">
                Most platforms blindly count keywords. If your resume lists "Python, SQL, Machine Learning", you receive a 100% keyword match even if you have never built a single application.
              </p>
              <p className="text-text-secondary mt-3 text-sm leading-relaxed">
                Our platform inspects your actual sentence descriptions. It identifies the practical implementation, the tools paired together, active implementation verbs, and measurable outcomes.
              </p>

              <div className="mt-6 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-navy-900">Evidence-Backed Skill</span>
                    <p className="text-xs text-text-secondary">Skill demonstrated in a concrete project or work experience with measurable results.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-navy-900">Weakly Supported Skill</span>
                    <p className="text-xs text-text-secondary">Studied in coursework or mentioned briefly without implementation depth.</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-navy-900">Claimed Skill Only</span>
                    <p className="text-xs text-text-secondary">Appears only in a bullet list without supporting project or work context.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Comparison Card */}
            <div className="bg-navy-900 text-white p-6 rounded-2xl shadow-xl border border-navy-800 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-navy-800">
                <span className="text-xs font-semibold text-gray-300">Evidence Extraction Example</span>
                <span className="text-xs px-2 py-0.5 bg-emerald/20 text-emerald rounded border border-emerald/30">Verified Parser</span>
              </div>

              <div className="bg-navy-800/90 p-4 rounded-xl border border-navy-700 text-xs font-mono text-gray-300">
                <p className="text-gray-400">// Resume Excerpt</p>
                <p className="mt-1 text-white">"Developed a student attendance tracking application using <span className="text-emerald font-bold">Python</span> and <span className="text-emerald font-bold">SQLite</span>, reducing lookup latency by 30%."</p>
              </div>

              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg text-xs">
                  <div>
                    <span className="font-bold text-white block">Python</span>
                    <span className="text-gray-400 text-[11px]">Source: Practical Project • Action Verb: Developed</span>
                  </div>
                  <span className="px-2 py-1 bg-emerald text-navy-950 font-bold rounded">85/100 Evidence</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-navy-800 rounded-lg text-xs">
                  <div>
                    <span className="font-bold text-white block">SQLite</span>
                    <span className="text-gray-400 text-[11px]">Source: Practical Project • Metric: 30% reduction</span>
                  </div>
                  <span className="px-2 py-1 bg-emerald text-navy-950 font-bold rounded">85/100 Evidence</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SDG 8 Alignment */}
      <section id="sdg8" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/60 rounded-3xl p-8 sm:p-12 border border-emerald-200 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald text-navy-950 text-xs font-bold">
              <Globe2 className="w-3.5 h-3.5" />
              <span>United Nations Sustainable Development Goals</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy-900">
              SDG 8: Decent Work & Economic Growth
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Target 8.6: Substantially reduce the proportion of youth not in employment, education, or training.
              Our platform bridges the critical divide between academic curriculum and industry job requirements by guiding students with evidence-based upskilling, eliminating bias, and making hiring preparation completely transparent.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-emerald-200 text-center w-full md:w-auto min-w-[240px]">
            <Award className="w-10 h-10 text-emerald mx-auto mb-2" />
            <span className="text-xs text-text-secondary font-medium block">Empowering Seekers</span>
            <span className="text-2xl font-bold text-navy-900 mt-1 block">Targeted Growth</span>
            <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">No Empty Claims</span>
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <footer className="mt-auto bg-navy-950 text-white border-t border-navy-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-emerald flex items-center justify-center font-bold text-navy-950 text-lg">
              R
            </div>
            <span className="font-bold text-base text-white">Resume Evidence & Skill Platform</span>
          </div>
          <p className="text-xs text-gray-400 text-center sm:text-right">
            Designed for transparent career guidance, evidence-based recruitment, and SDG 8 alignment.
          </p>
        </div>
      </footer>
    </div>
  );
};
