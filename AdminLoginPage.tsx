import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Mail, Lock, ArrowRight, AlertCircle, ShieldCheck,
  Users, FileText, Cpu, Briefcase, BookOpen, Activity
} from 'lucide-react';

export const AdminLoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publicStats, setPublicStats] = useState<{
    total_users: number;
    total_resumes: number;
    total_analyses: number;
    total_skills_in_taxonomy: number;
    total_job_roles: number;
    total_learning_resources: number;
  } | null>(null);

  // Fetch lightweight public platform stats (no auth required)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const resp = await fetch('/api/admin/public-stats');
        if (resp.ok) {
          const data = await resp.json();
          setPublicStats(data);
        }
      } catch {
        // Stats are optional on admin login page
      }
    };
    fetchStats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/admin');
    } catch (err: any) {
      setError(err.message || 'Admin login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmin = () => {
    setEmail('skanishka5607@gmail.com');
    setPassword('Admin@123456');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full space-y-6">
        {/* Platform Stats Overview (visible without login) */}
        {publicStats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
              <Users className="w-5 h-5 text-emerald mx-auto mb-1" />
              <span className="text-xl font-black text-white block">{publicStats.total_users}</span>
              <span className="text-[10px] text-gray-400 font-medium">Registered Users</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
              <FileText className="w-5 h-5 text-blue-400 mx-auto mb-1" />
              <span className="text-xl font-black text-white block">{publicStats.total_resumes}</span>
              <span className="text-[10px] text-gray-400 font-medium">Resumes Uploaded</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
              <Cpu className="w-5 h-5 text-purple-400 mx-auto mb-1" />
              <span className="text-xl font-black text-white block">{publicStats.total_analyses}</span>
              <span className="text-[10px] text-gray-400 font-medium">Analyses Run</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
              <Activity className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <span className="text-xl font-black text-white block">{publicStats.total_skills_in_taxonomy}</span>
              <span className="text-[10px] text-gray-400 font-medium">Skills in Taxonomy</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
              <Briefcase className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
              <span className="text-xl font-black text-white block">{publicStats.total_job_roles}</span>
              <span className="text-[10px] text-gray-400 font-medium">Job Role Templates</span>
            </div>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 text-center">
              <BookOpen className="w-5 h-5 text-rose-400 mx-auto mb-1" />
              <span className="text-xl font-black text-white block">{publicStats.total_learning_resources}</span>
              <span className="text-[10px] text-gray-400 font-medium">Learning Resources</span>
            </div>
          </div>
        )}

        {/* Admin Login Card */}
        <div className="bg-white rounded-2xl shadow-2xl border border-border-subtle p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-navy-900 text-amber-400 flex items-center justify-center mx-auto shadow-md">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-extrabold text-navy-900">Administrator Portal</h2>
            <p className="text-xs text-text-secondary">
              Manage skills taxonomy, job role templates, platform statistics, and audit records
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Admin Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@organization.com"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-amber-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-navy-900 hover:bg-navy-800 text-white font-bold rounded-lg shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
            >
              {loading ? <span>Authenticating...</span> : <><ShieldCheck className="w-4 h-4 text-amber-400" /><span>Sign In as Administrator</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Quick Admin Fill */}
          <div className="pt-4 border-t border-border-subtle space-y-2">
            <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block text-center">
              Demo Access
            </span>
            <button
              type="button"
              onClick={handleQuickAdmin}
              className="w-full p-3 bg-navy-50 hover:bg-navy-100 border border-navy-200 rounded-lg text-center transition-colors"
            >
              <div className="flex items-center justify-center space-x-1.5 text-navy-900 font-semibold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-navy-700" />
                <span>Fill Demo Admin Credentials</span>
              </div>
              <span className="text-[10px] text-text-secondary block mt-0.5">
                Access platform analytics, taxonomy management, and audit log
              </span>
            </button>
          </div>

          {/* Back to candidate login */}
          <p className="text-center text-xs text-text-secondary">
            Not an administrator?{' '}
            <a href="/login" className="text-emerald-700 font-bold hover:underline">
              Go to Candidate Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};
