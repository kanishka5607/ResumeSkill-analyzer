import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { LearningProgress } from '../types';
import {
  TrendingUp, CheckCircle2, Clock, BookOpen,
  ArrowRight, RefreshCw, FileText, AlertCircle, Edit3
} from 'lucide-react';

export const ProgressPage: React.FC = () => {
  const [tasks, setTasks] = useState<LearningProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [notesModal, setNotesModal] = useState<{ id: number; notes: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchProgress = async () => {
    setLoading(true);
    try {
      const data = await api.listLearningProgress();
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load learning progress.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleStatusChange = async (progressId: number, newStatus: string) => {
    setUpdatingId(progressId);
    try {
      await api.updateLearningProgress(progressId, { status: newStatus });
      await fetchProgress();
    } catch (err: any) {
      setError(err.message || 'Failed to update task status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async () => {
    if (!notesModal) return;
    try {
      await api.updateLearningProgress(notesModal.id, {
        status: tasks.find(t => t.id === notesModal.id)?.status || 'In Progress',
        user_notes: notesModal.notes,
      });
      setNotesModal(null);
      await fetchProgress();
    } catch (err: any) {
      setError(err.message || 'Failed to save notes.');
    }
  };

  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Learning Progress & Evidence Tracking</h2>
          <p className="text-xs text-text-secondary mt-1">
            Track your ongoing skill acquisition, exercises, and project milestones toward resume verification
          </p>
        </div>

        <Link
          to="/roadmap"
          className="px-4 py-2 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs shadow-sm transition-all flex items-center space-x-1.5 self-start"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Browse Roadmaps</span>
        </Link>
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary font-semibold">Total Tracked Tasks</span>
            <span className="text-2xl font-extrabold text-navy-900 block mt-1">{tasks.length}</span>
          </div>
          <BookOpen className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-xl" />
        </div>

        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary font-semibold">In Progress</span>
            <span className="text-2xl font-extrabold text-amber-600 block mt-1">{inProgressCount}</span>
          </div>
          <Clock className="w-8 h-8 text-amber-500 bg-amber-50 p-1.5 rounded-xl" />
        </div>

        <div className="p-5 bg-white rounded-2xl border border-border-subtle shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary font-semibold">Completed Milestones</span>
            <span className="text-2xl font-extrabold text-emerald block mt-1">{completedCount}</span>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald bg-emerald-50 p-1.5 rounded-xl" />
        </div>
      </div>

      {/* Verification Rule Notice */}
      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-start space-x-3 leading-relaxed">
        <CheckCircle2 className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Closed-Loop Progression Notice:</span>{' '}
          Marking a task complete tracks your candidate activity. To convert completed projects into verified score gains, add the project details and metrics to your resume and upload it for re-analysis!
        </div>
      </div>

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle font-bold text-xs text-navy-900">
          Enrolled Learning Activities ({tasks.length})
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-text-secondary">Loading tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-xs text-text-secondary">No learning activities tracked yet.</p>
            <Link
              to="/roadmap"
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald text-navy-950 font-bold rounded-lg text-xs"
            >
              <span>Explore 7-Step Roadmaps</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-primary">
              <thead className="bg-gray-50 border-b border-border-subtle text-text-secondary font-semibold">
                <tr>
                  <th className="p-3.5">Skill & Resource</th>
                  <th className="p-3.5">Started Date</th>
                  <th className="p-3.5">Current Status</th>
                  <th className="p-3.5">Notes</th>
                  <th className="p-3.5 text-right">Update Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {tasks.map((t) => {
                  const isDone = t.status === 'Completed';
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5">
                        <span className="font-bold text-navy-900 block">{t.resource_title}</span>
                        <span className="text-[10px] text-text-secondary font-semibold text-emerald-800">
                          Target Skill: {t.skill_name}
                        </span>
                      </td>

                      <td className="p-3.5 text-text-secondary">
                        {t.started_at ? new Date(t.started_at).toLocaleDateString() : 'Recently'}
                      </td>

                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isDone ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                        }`}>
                          {t.status}
                        </span>
                      </td>

                      <td className="p-3.5 max-w-xs truncate text-text-secondary">
                        {t.user_notes ? (
                          <span className="italic">"{t.user_notes}"</span>
                        ) : (
                          <button
                            onClick={() => setNotesModal({ id: t.id, notes: '' })}
                            className="text-emerald hover:underline text-[11px] flex items-center space-x-1"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Add note</span>
                          </button>
                        )}
                      </td>

                      <td className="p-3.5 text-right space-x-2">
                        {isDone ? (
                          <button
                            onClick={() => handleStatusChange(t.id, 'In Progress')}
                            disabled={updatingId === t.id}
                            className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold rounded"
                          >
                            Mark In Progress
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(t.id, 'Completed')}
                            disabled={updatingId === t.id}
                            className="px-2.5 py-1 bg-emerald hover:bg-emerald-600 text-navy-950 text-[11px] font-bold rounded shadow-sm"
                          >
                            Mark Completed
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Notes Modal */}
      {notesModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-navy-900">Add Learning Notes / Repo Links</h3>
            <textarea
              rows={4}
              value={notesModal.notes}
              onChange={(e) => setNotesModal({ ...notesModal, notes: e.target.value })}
              placeholder="e.g. Completed module 3 exercises. GitHub repo: github.com/username/attendance-app"
              className="w-full p-3 bg-gray-50 border border-border-subtle rounded-xl text-xs text-text-primary focus:outline-none focus:border-emerald"
            ></textarea>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setNotesModal(null)}
                className="px-3 py-1.5 text-xs text-text-secondary hover:text-navy-900"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotes}
                className="px-4 py-1.5 bg-emerald text-navy-950 font-bold rounded-lg text-xs"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
