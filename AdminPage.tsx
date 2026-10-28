import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { AdminStats } from '../types';
import {
  ShieldAlert, Users, FileText, Cpu, Briefcase,
  BookOpen, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle2,
  Search, ShieldCheck, UserCheck, Calendar, Activity
} from 'lucide-react';

export const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [skills, setSkills] = useState<any[]>([]);
  const [userData, setUserData] = useState<{
    total_users: number;
    admin_count: number;
    candidate_count: number;
    users: any[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'users' | 'skills'
  const [activeTab, setActiveTab] = useState<'users' | 'skills'>('users');
  const [userSearch, setUserSearch] = useState('');

  // Skill form state
  const [newCanonical, setNewCanonical] = useState('');
  const [newCategory, setNewCategory] = useState('Programming Languages');
  const [newAliases, setNewAliases] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsData, skillsData, usersInfo] = await Promise.all([
        api.getAdminStats(),
        api.adminListSkills(),
        api.adminListUsers(),
      ]);
      setStats(statsData);
      setSkills(skillsData);
      setUserData(usersInfo);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator portal.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCanonical.trim()) return;

    setError(null);
    setStatusMessage(null);
    setAddingSkill(true);

    try {
      const aliasList = newAliases.split(',').map(a => a.trim()).filter(Boolean);
      await api.adminCreateSkill({
        canonical_name: newCanonical.trim(),
        category: newCategory,
        description: `Canonical ${newCategory.toLowerCase()} skill: ${newCanonical.trim()}`,
        aliases: aliasList,
      });

      setStatusMessage(`Added "${newCanonical.trim()}" to platform skill taxonomy.`);
      setNewCanonical('');
      setNewAliases('');
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to add skill.');
    } finally {
      setAddingSkill(false);
    }
  };

  const handleDeleteSkill = async (id: number, name: string) => {
    if (!window.confirm(`Delete skill "${name}" from platform taxonomy?`)) return;
    try {
      await api.adminDeleteSkill(id);
      await fetchAdminData();
    } catch (err: any) {
      setError(err.message || 'Failed to delete skill.');
    }
  };

  const filteredUsers = (userData?.users || []).filter(u => {
    const q = userSearch.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <RefreshCw className="w-8 h-8 text-emerald animate-spin" />
        <p className="text-sm text-text-secondary font-medium">Loading platform management data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-subtle">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-navy-900 text-amber-400 flex items-center justify-center font-bold shadow-sm">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-navy-900">Administrator Management Portal</h2>
            <p className="text-xs text-text-secondary">
              Platform governance, registered user management, and taxonomy oversight
            </p>
          </div>
        </div>

        <button
          onClick={fetchAdminData}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-navy-900 font-semibold rounded-lg text-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Data</span>
        </button>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Global Metrics Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-text-secondary font-semibold">Total Users</span>
              <span className="text-2xl font-black text-navy-900 block mt-1">{stats.total_users}</span>
              <span className="text-[10px] text-emerald-700 font-medium">
                {userData?.candidate_count || 0} Candidates, {userData?.admin_count || 1} Admin
              </span>
            </div>
            <Users className="w-8 h-8 text-emerald bg-emerald-50 p-1.5 rounded-xl" />
          </div>

          <div className="p-4 bg-white rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-text-secondary font-semibold">Uploaded Resumes</span>
              <span className="text-2xl font-black text-navy-900 block mt-1">{stats.total_resumes}</span>
              <span className="text-[10px] text-text-secondary font-medium">
                {stats.total_analyses} Analyses Run
              </span>
            </div>
            <FileText className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-xl" />
          </div>

          <div className="p-4 bg-white rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-text-secondary font-semibold">Taxonomy Skills</span>
              <span className="text-2xl font-black text-navy-900 block mt-1">{stats.total_skills_in_taxonomy}</span>
              <span className="text-[10px] text-text-secondary font-medium">Canonical Dictionary</span>
            </div>
            <Cpu className="w-8 h-8 text-purple-500 bg-purple-50 p-1.5 rounded-xl" />
          </div>

          <div className="p-4 bg-white rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between">
            <div>
              <span className="text-[11px] text-text-secondary font-semibold">Target Job Roles</span>
              <span className="text-2xl font-black text-navy-900 block mt-1">{stats.total_job_roles}</span>
              <span className="text-[10px] text-text-secondary font-medium">Predefined Templates</span>
            </div>
            <Briefcase className="w-8 h-8 text-amber-500 bg-amber-50 p-1.5 rounded-xl" />
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex border-b border-border-subtle">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center space-x-2 px-5 py-3 font-semibold text-xs transition-colors border-b-2 -mb-px ${
            activeTab === 'users'
              ? 'border-emerald text-navy-900 font-bold bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-text-secondary hover:text-navy-900'
          }`}
        >
          <Users className="w-4 h-4 text-emerald" />
          <span>Registered Users & Accounts ({userData?.total_users || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('skills')}
          className={`flex items-center space-x-2 px-5 py-3 font-semibold text-xs transition-colors border-b-2 -mb-px ${
            activeTab === 'skills'
              ? 'border-emerald text-navy-900 font-bold bg-emerald-50/50 rounded-t-lg'
              : 'border-transparent text-text-secondary hover:text-navy-900'
          }`}
        >
          <Cpu className="w-4 h-4 text-purple-500" />
          <span>Skill Taxonomy Management ({skills.length})</span>
        </button>
      </div>

      {/* TAB 1: REGISTERED USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden space-y-4 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-navy-900 flex items-center space-x-2">
                <UserCheck className="w-4 h-4 text-emerald" />
                <span>All Registered Users in Platform ({userData?.total_users || 0})</span>
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Overview of user profiles, email addresses, assigned roles, and activity stats
              </p>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto border border-border-subtle rounded-xl">
            <table className="w-full text-left text-xs text-text-primary">
              <thead className="bg-gray-50 border-b border-border-subtle text-text-secondary font-semibold">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Email Address</th>
                  <th className="p-3.5">Platform Role</th>
                  <th className="p-3.5 text-center">Resumes Uploaded</th>
                  <th className="p-3.5 text-center">Analyses Run</th>
                  <th className="p-3.5">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-text-secondary">
                      No users match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isAdmin = u.role === 'admin';
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3.5 font-bold text-navy-900">
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isAdmin ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}>
                              {u.full_name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <span className="block leading-tight">{u.full_name || 'Anonymous User'}</span>
                              <span className="text-[10px] text-text-secondary font-normal">ID #{u.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5 font-mono text-xs text-text-secondary">
                          {u.email}
                        </td>
                        <td className="p-3.5">
                          {isAdmin ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <ShieldCheck className="w-3 h-3 text-amber-600" />
                              <span>Platform Administrator</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <span>Candidate (Student)</span>
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-bold text-navy-900">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {u.resumes_count}
                          </span>
                        </td>
                        <td className="p-3.5 text-center font-bold text-navy-900">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {u.analyses_count}
                          </span>
                        </td>
                        <td className="p-3.5 text-text-secondary">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-3 h-3 text-text-secondary" />
                            <span>
                              {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: SKILLS TAXONOMY MANAGEMENT */}
      {activeTab === 'skills' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Skill Form */}
          <div className="bg-white p-6 rounded-2xl border border-border-subtle shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-navy-900 flex items-center space-x-1.5">
              <Plus className="w-4 h-4 text-emerald" />
              <span>Add Skill to Taxonomy</span>
            </h3>

            <form onSubmit={handleAddSkill} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">Canonical Name</label>
                <input
                  type="text"
                  placeholder="e.g. Tailwind CSS, GraphQL"
                  value={newCanonical}
                  onChange={(e) => setNewCanonical(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
                >
                  <option value="Programming Languages">Programming Languages</option>
                  <option value="Web Development">Web Development</option>
                  <option value="Database">Database</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Artificial Intelligence and Machine Learning">AI and Machine Learning</option>
                  <option value="Tools and Platforms">Tools and Platforms</option>
                  <option value="Soft Skills">Soft Skills</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-navy-900 mb-1">Aliases (comma separated)</label>
                <input
                  type="text"
                  placeholder="e.g. tailwind, tailwindcss"
                  value={newAliases}
                  onChange={(e) => setNewAliases(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-border-subtle rounded-lg text-xs text-navy-900 focus:outline-none focus:border-emerald"
                />
              </div>

              <button
                type="submit"
                disabled={addingSkill}
                className="w-full py-2 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs transition-colors disabled:opacity-50 flex items-center justify-center space-x-1"
              >
                {addingSkill ? <span>Adding...</span> : <><span>Add to Taxonomy</span><Plus className="w-3.5 h-3.5" /></>}
              </button>
            </form>
          </div>

          {/* Taxonomy Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border-subtle flex items-center justify-between">
              <h3 className="text-sm font-bold text-navy-900">Current Platform Taxonomy ({skills.length} skills)</h3>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[500px]">
              <table className="w-full text-left text-xs text-text-primary">
                <thead className="bg-gray-50 sticky top-0 text-text-secondary font-semibold">
                  <tr>
                    <th className="p-3">Skill</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Aliases</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {skills.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-bold text-navy-900">{s.canonical_name}</td>
                      <td className="p-3 text-text-secondary">{s.category}</td>
                      <td className="p-3 text-text-secondary font-mono text-[11px]">
                        {s.aliases?.map((a: any) => a.alias).join(', ') || '—'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteSkill(s.id, s.canonical_name)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                          title="Delete skill"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
