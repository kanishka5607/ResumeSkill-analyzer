import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  User as UserIcon, Mail, ShieldCheck, Globe2,
  Calendar, LogOut, CheckCircle2
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-navy-900">User Profile & Account Settings</h2>
        <p className="text-xs text-text-secondary mt-1">
          Candidate credentials, platform authorization role, and SDG 8 alignment
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-6">
          <div className="flex items-center space-x-4 pb-6 border-b border-border-subtle">
            <div className="w-16 h-16 rounded-full bg-navy-900 text-emerald flex items-center justify-center font-bold text-2xl border-2 border-emerald shadow-md">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div>
              <h3 className="text-xl font-bold text-navy-900">{user?.full_name}</h3>
              <span className="text-xs text-emerald-800 font-semibold px-2.5 py-0.5 bg-emerald-50 rounded-full border border-emerald-200 capitalize">
                {user?.role} Account
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 text-xs">
              <Mail className="w-4 h-4 text-text-secondary" />
              <div>
                <span className="text-text-secondary block">Email Address</span>
                <span className="font-semibold text-navy-900">{user?.email}</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <ShieldCheck className="w-4 h-4 text-text-secondary" />
              <div>
                <span className="text-text-secondary block">Access Authorization</span>
                <span className="font-semibold text-navy-900 capitalize">{user?.role} Level Permissions</span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <Calendar className="w-4 h-4 text-text-secondary" />
              <div>
                <span className="text-text-secondary block">Account Created</span>
                <span className="font-semibold text-navy-900">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active Member'}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border-subtle flex justify-end">
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs rounded-lg transition-colors flex items-center space-x-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out of Platform</span>
            </button>
          </div>
        </div>

        {/* SDG 8 Commitment Card */}
        <div className="bg-emerald-50/70 border border-emerald-200 p-6 rounded-2xl flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald text-navy-950 flex items-center justify-center font-bold">
              <Globe2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-bold text-navy-900">SDG 8 Mission Alignment</h4>
            <p className="text-xs text-emerald-950 leading-relaxed">
              Decent Work & Economic Growth. We empower candidates by moving from opaque keyword rejections to transparent, evidence-backed skill roadmaps.
            </p>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 space-y-1">
            <span className="font-bold block">Privacy Standard:</span>
            <span>Your uploaded documents are securely processed and never shared with unauthorized third parties.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
