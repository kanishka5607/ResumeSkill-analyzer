import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Resume } from '../types';
import {
  Upload, FileText, Trash2, Cpu, CheckCircle2,
  AlertCircle, Sparkles, RefreshCw, Eye, X,
  Camera, Image as ImageIcon, FileCheck
} from 'lucide-react';

export const ResumesPage: React.FC = () => {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedResumeText, setSelectedResumeText] = useState<{ filename: string; text: string } | null>(null);

  const fetchResumes = async () => {
    setLoading(true);
    try {
      const data = await api.listResumes();
      setResumes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch resumes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResumes();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/') || /\.(png|jpg|jpeg|webp|bmp)$/i.test(file.name);

    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      if (isImage) {
        setSuccess(`Reading and performing OCR on photo "${file.name}"...`);
      }
      const newResume = await api.uploadResume(file);
      setSuccess(`Extracted text from ${file.name} successfully! Running evidence analysis...`);
      // Trigger automatic extraction & analysis
      await api.analyzeResume(newResume.id);
      setSuccess(`Analyzed ${file.name} successfully! Redirecting to skills...`);
      await fetchResumes();
      navigate('/skills');
    } catch (err: any) {
      setError(err.message || 'Failed to upload or parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadDemo = async () => {
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const demo = await api.loadDemoResume();
      await api.analyzeResume(demo.id);
      setSuccess('Loaded and analyzed sample candidate resume successfully!');
      await fetchResumes();
    } catch (err: any) {
      setError(err.message || 'Failed to load demo resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleLoadDemoPhoto = async () => {
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      setSuccess('Running native OCR on sample resume photo (Alex Rivera)...');
      const demo = await api.loadDemoPhotoResume();
      await api.analyzeResume(demo.id);
      setSuccess('OCR and evidence extraction on resume photo completed successfully!');
      await fetchResumes();
      navigate('/skills');
    } catch (err: any) {
      setError(err.message || 'Failed to load demo photo resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async (resumeId: number) => {
    setError(null);
    setLoading(true);
    try {
      await api.analyzeResume(resumeId);
      navigate('/skills');
    } catch (err: any) {
      setError(err.message || 'Analysis failed.');
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this resume and its analysis history?')) return;
    try {
      await api.deleteResume(id);
      await fetchResumes();
    } catch (err: any) {
      setError(err.message || 'Failed to delete resume.');
    }
  };

  const handleViewText = async (id: number, filename: string) => {
    try {
      const res = await api.getResume(id);
      setSelectedResumeText({ filename, text: (res as any).extracted_text || 'No text extracted' });
    } catch (err: any) {
      setError(err.message || 'Failed to load document text.');
    }
  };

  const isImageResume = (format?: string) => {
    if (!format) return false;
    return ['png', 'jpg', 'jpeg', 'webp', 'bmp'].includes(format.toLowerCase());
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-navy-900">Resume Ingestion & Document Manager</h2>
          <p className="text-xs text-text-secondary mt-1">
            Upload PDF, Word document, or a <strong>Photo / Scanned image</strong> of your resume with native OCR.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleLoadDemo}
            disabled={uploading}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-navy-900 font-semibold rounded-lg text-xs shadow-sm transition-all disabled:opacity-50"
            title="Load standard student PDF demo"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Demo Text Resume</span>
          </button>

          <button
            onClick={handleLoadDemoPhoto}
            disabled={uploading}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs shadow-sm transition-all disabled:opacity-50"
            title="Load and OCR a sample photo resume"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Load Demo Photo Resume</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald" />
          <span>{success}</span>
        </div>
      )}

      {/* Upload Dropzones */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Document Dropzone (PDF / DOCX) */}
        <div className="p-6 bg-white border-2 border-dashed border-border-subtle rounded-2xl text-center space-y-3 hover:border-emerald transition-colors">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            {uploading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
          </div>
          <div>
            <span className="text-sm font-bold text-navy-900 block">Document Resume (PDF / Word)</span>
            <span className="text-xs text-text-secondary mt-0.5 block">
              Extracts text from selectable PDF or DOCX files
            </span>
          </div>

          <label className="inline-flex items-center space-x-2 px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white font-semibold rounded-lg text-xs cursor-pointer shadow transition-all">
            <Upload className="w-3.5 h-3.5 text-emerald" />
            <span>Select PDF or DOCX</span>
            <input
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>

        {/* Photo Dropzone (PNG, JPG, Camera) */}
        <div className="p-6 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 border-2 border-dashed border-emerald-300 rounded-2xl text-center space-y-3 hover:border-emerald-500 transition-colors">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
            {uploading ? <RefreshCw className="w-5 h-5 animate-spin text-emerald-600" /> : <Camera className="w-5 h-5 text-emerald-700" />}
          </div>
          <div>
            <div className="flex items-center justify-center space-x-1.5">
              <span className="text-sm font-bold text-navy-900">Resume as Photo / Camera</span>
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald text-navy-950 rounded">OCR</span>
            </div>
            <span className="text-xs text-text-secondary mt-0.5 block">
              Upload photos, screenshots, or camera pictures (PNG, JPG, WEBP)
            </span>
          </div>

          <div className="flex items-center justify-center gap-2">
            <label className="inline-flex items-center space-x-1.5 px-4 py-2 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded-lg text-xs cursor-pointer shadow transition-all">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Choose Photo</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>

            <label className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-gray-50 text-navy-900 font-semibold border border-border-subtle rounded-lg text-xs cursor-pointer shadow-sm transition-all">
              <Camera className="w-3.5 h-3.5 text-emerald-600" />
              <span>Take Photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Resumes List Table */}
      <div className="bg-white rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="text-sm font-bold text-navy-900">Your Resumes ({resumes.length})</h3>
          <span className="text-xs text-text-secondary">Strictly isolated to your account</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-text-secondary">Loading resumes...</div>
        ) : resumes.length === 0 ? (
          <div className="p-12 text-center text-xs text-text-secondary">
            No resumes uploaded yet. Upload a PDF/DOCX or click <strong>"Load Demo Photo Resume"</strong> to test OCR.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-text-primary">
              <thead className="bg-gray-50 border-b border-border-subtle text-text-secondary font-semibold">
                <tr>
                  <th className="p-3.5">Filename</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Upload Date</th>
                  <th className="p-3.5">Parsing Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {resumes.map((r) => {
                  const isImg = isImageResume(r.file_type);
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3.5 font-bold text-navy-900">
                        <div className="flex items-center space-x-2">
                          {isImg ? (
                            <Camera className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-text-secondary flex-shrink-0" />
                          )}
                          <span className="truncate max-w-[220px]" title={r.original_filename}>{r.original_filename}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded uppercase font-semibold text-[10px] ${
                          isImg ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' : 'bg-gray-100 text-text-secondary'
                        }`}>
                          {isImg ? `PHOTO (${r.file_type})` : r.file_type}
                        </span>
                      </td>
                      <td className="p-3.5 text-text-secondary">
                        {new Date(r.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100">
                          {r.processing_status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => handleViewText(r.id, r.original_filename)}
                          className="px-2.5 py-1 text-gray-600 hover:text-navy-900 hover:bg-gray-100 rounded text-xs transition-colors inline-flex items-center space-x-1 border border-border-subtle"
                          title="Inspect extracted OCR text"
                        >
                          <Eye className="w-3 h-3 text-text-secondary" />
                          <span>View Text</span>
                        </button>
                        <button
                          onClick={() => handleAnalyze(r.id)}
                          className="px-3 py-1 bg-emerald hover:bg-emerald-600 text-navy-950 font-bold rounded text-xs transition-colors inline-flex items-center space-x-1"
                        >
                          <Cpu className="w-3 h-3" />
                          <span>Analyze</span>
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors inline-block align-middle"
                          title="Delete resume"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal for Raw Text Inspection */}
      {selectedResumeText && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-subtle">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald" />
                <h3 className="text-sm font-bold text-navy-900">{selectedResumeText.filename} - Extracted OCR Text</h3>
              </div>
              <button onClick={() => setSelectedResumeText(null)} className="text-gray-400 hover:text-navy-900">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded-xl font-mono text-xs text-text-primary whitespace-pre-wrap leading-relaxed border border-border-subtle">
              {selectedResumeText.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
