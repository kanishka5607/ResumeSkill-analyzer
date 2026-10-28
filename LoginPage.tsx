import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-border-subtle p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-navy-900 text-emerald flex items-center justify-center font-bold text-2xl mx-auto shadow-md">
            R
          </div>
          <h2 className="text-2xl font-extrabold text-navy-900">Sign in to your account</h2>
          <p className="text-xs text-text-secondary">
            Access your evidence portfolio, readiness reports, and upskilling roadmaps
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-emerald focus:bg-white transition-all"
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
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-emerald focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
          >
            {loading ? <span>Signing In...</span> : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {/* Quick Demo Credentials — Candidate Only */}
        <div className="pt-4 border-t border-border-subtle space-y-2">
          <span className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider block text-center">
            Try Instantly
          </span>
          <button
            type="button"
            onClick={() => handleQuickDemo('candidate@resumeskill.com', 'Candidate@123456')}
            className="w-full p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-center transition-colors"
          >
            <div className="flex items-center justify-center space-x-1.5 text-emerald-800 font-semibold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>Fill Demo Candidate Credentials</span>
            </div>
            <span className="text-[10px] text-text-secondary block mt-0.5">
              Pre-loaded resume with skill evidence and analysis
            </span>
          </button>
        </div>

        {/* Register Footer */}
        <p className="text-center text-xs text-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-emerald-700 font-bold hover:underline">
            Register as a Candidate
          </Link>
        </p>
      </div>
    </div>
  );
};
