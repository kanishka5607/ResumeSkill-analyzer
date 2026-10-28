import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useActiveEvaluation } from '../context/ActiveEvaluationContext';
import {
  LayoutDashboard, FileText, Cpu, ShieldCheck, Target,
  CheckCircle2, AlertTriangle, Compass, Network, Sparkles,
  TrendingUp, History, User, LogOut, Menu, X, ShieldAlert,
  ArrowRight
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { targetTitle } = useActiveEvaluation();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Resumes', path: '/resumes', icon: FileText },
    { label: 'Extracted Skills', path: '/skills', icon: Cpu },
    { label: 'Evidence Details', path: '/evidence', icon: ShieldCheck },
    { label: 'Target Jobs', path: '/jobs', icon: Target },
    { label: 'Job Readiness', path: '/readiness', icon: CheckCircle2 },
    { label: 'Skill Gaps', path: '/gaps', icon: AlertTriangle },
    { label: 'Upskilling Roadmap', path: '/roadmap', icon: Compass },
    { label: 'Evidence Graph', path: '/graph', icon: Network },
    { label: 'Resume Simulator', path: '/simulator', icon: Sparkles },
    { label: 'Learning Progress', path: '/progress', icon: TrendingUp },
    { label: 'Analysis History', path: '/history', icon: History },
  ];

  if (user?.role === 'admin') {
    navItems.push({ label: 'Admin Portal', path: '/admin', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-warm-bg flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-navy-900 border-r border-navy-800 text-white select-none">
        {/* Brand & SDG Badge */}
        <div className="p-5 border-b border-navy-800">
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald flex items-center justify-center font-bold text-navy-950 text-xl shadow-md">
              R
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-white block">ResumeEvidence</span>
              <span className="text-[10px] text-emerald font-semibold uppercase tracking-wider block">Skill Proof Platform</span>
            </div>
          </Link>
          <div className="mt-3 flex items-center space-x-1.5 px-2.5 py-1 bg-navy-800/80 rounded-md border border-navy-700">
            <span className="w-2 h-2 rounded-full bg-emerald animate-pulse"></span>
            <span className="text-[11px] text-gray-300 font-medium">SDG 8: Decent Work</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald text-navy-950 font-semibold shadow-sm'
                    : 'text-gray-300 hover:text-white hover:bg-navy-800'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-navy-950' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-navy-800 bg-navy-950/60 flex items-center justify-between">
          <Link to="/profile" className="flex items-center space-x-3 truncate">
            <div className="w-8 h-8 rounded-full bg-emerald/20 text-emerald flex items-center justify-center font-semibold text-xs border border-emerald/30">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">{user?.full_name || 'Candidate'}</p>
              <p className="text-[11px] text-gray-400 truncate capitalize">{user?.role || 'candidate'}</p>
            </div>
          </Link>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-navy-800 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative w-72 bg-navy-900 text-white flex flex-col z-50 p-4">
            <div className="flex items-center justify-between pb-4 border-b border-navy-800">
              <span className="font-bold text-lg text-white">ResumeEvidence</span>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400">
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                      isActive ? 'bg-emerald text-navy-950 font-semibold' : 'text-gray-300 hover:bg-navy-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-navy-800 flex items-center justify-between">
              <span className="text-xs text-gray-400">{user?.email}</span>
              <button onClick={handleLogout} className="text-xs text-red-400">Logout</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-border-subtle flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-text-secondary hover:text-text-primary rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h1 className="text-sm font-semibold text-text-primary">
                Resume Skill Evidence & Gap Analysis
              </h1>
              <p className="text-xs text-text-secondary">
                Explainable, evidence-backed career readiness
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {targetTitle && (
              <Link
                to="/readiness"
                className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-navy-50 hover:bg-emerald-50 text-navy-900 hover:text-emerald-950 border border-border-subtle rounded-full text-xs font-semibold transition-colors"
                title="Current active target job evaluation"
              >
                <Target className="w-3.5 h-3.5 text-emerald" />
                <span className="truncate max-w-[170px]">{targetTitle}</span>
              </Link>
            )}

            <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
              <span className="w-2 h-2 rounded-full bg-emerald"></span>
              <span>Evidence Engine</span>
            </div>

            <Link
              to="/resumes"
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-navy-900 hover:bg-navy-800 text-white rounded-lg text-xs font-medium shadow-sm transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Analyze Resume</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1.5 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-medium transition-colors"
              title="Sign out of your account"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
