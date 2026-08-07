import React, { useState } from 'react';
import api from '../../api/api';
import { X, UploadCloud, AlertCircle, CheckCircle2, Loader2, BookOpen, Bookmark } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const { user } = useAuth();
  const [subject, setSubject] = useState('');
  const [title, setTitle] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are supported.');
        setFile(null);
      } else {
        setError(null);
        setFile(selectedFile);
        // Pre-fill title if empty
        if (!title) {
          const baseName = selectedFile.name.replace(/\.[^/.]+$/, ""); // strip extension
          setTitle(baseName);
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !title || !file) {
      setError('Please fill in all fields and select a PDF file.');
      return;
    }

    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('subject', subject.trim());
    formData.append('title', title.trim());
    formData.append('isPublic', String(isPublic));
    formData.append('file', file);

    try {
      await api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setSubject('');
        setTitle('');
        setIsPublic(false);
        setFile(null);
        onUploadSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.error || 'Upload failed. Please check file and server status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Box */}
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl p-6 md:p-8 overflow-hidden z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-brand-400" />
              Upload Study Notes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">PDF notes will be chunked and indexed automatically</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded-lg text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-all"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Success Screen */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center">
            <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-12 h-12 animate-bounce" />
            </div>
            <h4 className="text-lg font-bold text-white">Upload Successful!</h4>
            <p className="text-sm text-slate-400">Your notes are queued for processing...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Subject Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5" htmlFor="upload-subject">
                <BookOpen className="w-3.5 h-3.5" />
                Subject
              </label>
              <input
                id="upload-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Computer Networks, Database Systems"
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none rounded-xl px-4 py-2.5 text-slate-100 text-sm placeholder-slate-650 transition-all"
                disabled={loading}
              />
            </div>

            {/* Title Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5" htmlFor="upload-title">
                <Bookmark className="w-3.5 h-3.5" />
                Document Title
              </label>
              <input
                id="upload-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Unit 1 - Introduction to OSI Layers"
                className="w-full bg-slate-950/50 border border-slate-800 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none rounded-xl px-4 py-2.5 text-slate-100 text-sm placeholder-slate-650 transition-all"
                disabled={loading}
              />
            </div>

            {/* File Dropzone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Select PDF File
              </label>
              <div className="border-2 border-dashed border-slate-800 hover:border-brand-500/50 rounded-2xl p-6 text-center cursor-pointer transition-all relative group bg-slate-950/30">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={loading}
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-brand-400 transition-colors" />
                  {file ? (
                    <div className="text-sm font-semibold text-slate-200">
                      {file.name}
                      <span className="text-xs text-slate-500 block">
                        ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-slate-300 font-medium">Drag & drop your PDF notes, or browse files</p>
                      <p className="text-[10px] text-slate-500">Only PDF formats supported up to 10MB limit</p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Share checkbox */}
            <div className="flex items-center gap-2.5 px-1 py-1">
              <input
                id="upload-is-public"
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 bg-slate-950 border-slate-800 focus:ring-brand-500 focus:ring-1 focus:ring-offset-0 focus:outline-none cursor-pointer"
                disabled={loading}
              />
              <label htmlFor="upload-is-public" className="text-xs font-semibold text-slate-400 cursor-pointer select-none">
                Share notes with fellow students of <span className="text-brand-400">{user?.college || 'my college'}</span>
              </label>
            </div>

            {/* Submit Button */}
            <div className="flex gap-3 justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800 hover:text-white text-slate-400 font-semibold text-sm transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-brand-500/10 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  'Start Processing'
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default UploadModal;
