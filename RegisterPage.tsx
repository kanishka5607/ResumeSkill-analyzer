import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter (A-Z).');
      return;
    }
    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter (a-z).');
      return;
    }
    if (!/[0-9\W_]/.test(password)) {
      setError('Password must contain at least one number or special symbol.');
      return;
    }

    setLoading(true);
    try {
      await register({
        full_name: fullName,
        email,
        password,
        role: 'candidate',
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-warm-bg flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-border-subtle p-8 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-navy-900 text-emerald flex items-center justify-center font-bold text-2xl mx-auto shadow-md">
            R
          </div>
          <h2 className="text-2xl font-extrabold text-navy-900">Create an Account</h2>
          <p className="text-xs text-text-secondary">
            Join the evidence-backed resume and career readiness platform
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
            <label className="block text-xs font-semibold text-text-primary mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Alex Morgan"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-emerald focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@university.edu"
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
                placeholder="Min 8 chars, upper + lower + number/symbol"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-emerald focus:bg-white transition-all"
              />
            </div>
            <p className="text-[10px] text-text-secondary mt-1">
              At least 8 characters with uppercase, lowercase, and a number or symbol.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">Confirm Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-text-secondary absolute left-3 top-3" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-border-subtle rounded-lg text-sm text-text-primary focus:outline-none focus:border-emerald focus:bg-white transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg shadow transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-sm"
          >
            {loading ? <span>Creating Account...</span> : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        {/* Login Link */}
        <p className="text-center text-xs text-text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-emerald-700 font-bold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
