import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import UploadModal from '../components/upload/UploadModal';
import { 
  ArrowLeft, UploadCloud, FileText, Trash2, MessageSquare, 
  HelpCircle, RefreshCw, AlertCircle, CheckCircle2 
} from 'lucide-react';

interface Document {
  _id: string;
  subject: string;
  title: string;
  fileUrl: string;
  status: 'processing' | 'ready' | 'failed';
  createdAt: string;
  isShared?: boolean;
  creatorName?: string;
  isPublic?: boolean;
}

export const SubjectView: React.FC = () => {
  const { subjectName } = useParams<{ subjectName: string }>();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const decodedSubject = decodeURIComponent(subjectName || '');

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      const filtered = (res.data.documents || []).filter(
        (doc: Document) => doc.subject.toLowerCase() === decodedSubject.toLowerCase()
      );
      setDocuments(filtered);
    } catch (err) {
      console.error('Failed to fetch documents for subject:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [subjectName]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this document? All parsed text chunks and resources will be removed.')) {
      return;
    }
    try {
      await api.delete(`/documents/${id}`);
      setDocuments(documents.filter((doc) => doc._id !== id));
    } catch (err) {
      console.error('Failed to delete document:', err);
      alert('Delete failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative selection:bg-brand-500 selection:text-white">
      {/* Ambient background blur */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all py-1.5 px-3 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>

        <h1 className="text-lg font-bold text-white tracking-tight text-center truncate max-w-xs md:max-w-md">
          {decodedSubject}
        </h1>

        <button 
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1.5 bg-brand-650 hover:bg-brand-600 border border-brand-550/20 text-white font-bold py-1.5 px-4 rounded-xl text-xs shadow-md active:scale-95 transition-all"
        >
          <UploadCloud className="w-4 h-4" />
          Upload PDF
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10 space-y-6">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <RefreshCw className="w-10 h-10 text-brand-500 animate-spin" />
            <p className="text-sm text-slate-400">Loading subject materials...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="border border-dashed border-slate-800 rounded-3xl p-16 text-center space-y-4 bg-slate-900/10">
            <FileText className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="space-y-1">
              <h3 className="font-bold text-slate-350">No notes found for this subject</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">Start by uploading your lecture slides, notes, or chapter chapters in PDF format.</p>
            </div>
            <button
              onClick={() => setUploadOpen(true)}
              className="bg-slate-900 hover:bg-slate-800 text-brand-400 border border-brand-500/20 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all mx-auto"
            >
              <UploadCloud className="w-4 h-4" />
              Upload PDF
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-900 pb-2.5">
              <span>{documents.length} Document{documents.length > 1 ? 's' : ''} Uploaded</span>
              <button 
                onClick={fetchDocuments}
                className="hover:text-white flex items-center gap-1.5 text-[10px] tracking-wider uppercase font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Sync Status
              </button>
            </div>

            <div className="grid gap-4">
              {documents.map((doc) => (
                <div 
                  key={doc._id}
                  className="bg-slate-900/60 border border-slate-850/80 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm hover:border-slate-800 transition-all"
                >
                  {/* Left Side: Doc Metadata */}
                  <div className="flex items-start gap-4">
                    <div className="bg-brand-500/10 text-brand-400 p-3 rounded-xl border border-brand-500/10 shrink-0">
                      <FileText className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <h4 className="font-bold text-white text-sm md:text-base tracking-tight truncate max-w-xs md:max-w-md">
                        {doc.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Status badge */}
                        {doc.status === 'processing' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                            processing text chunks
                          </span>
                        )}
                        {doc.status === 'ready' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            ready for RAG doubt chat
                          </span>
                        )}
                        {doc.status === 'failed' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                            <AlertCircle className="w-2.5 h-2.5" />
                            extraction failed
                          </span>
                        )}
                        {doc.isShared ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                            Shared by {doc.creatorName}
                          </span>
                        ) : doc.isPublic ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2.5 py-0.5 rounded-full">
                            Shared with College
                          </span>
                        ) : null}
                        <span className="text-[10px] text-slate-500">
                          Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Action buttons */}
                  <div className="flex flex-wrap items-center gap-2 md:self-center">
                    
                    {/* Chat link (disabled if not ready) */}
                    <button
                      disabled={doc.status !== 'ready'}
                      onClick={() => navigate(`/chat/${doc._id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      Chat
                    </button>

                    {/* Quiz link (disabled if not ready) */}
                    <button
                      disabled={doc.status !== 'ready'}
                      onClick={() => navigate(`/quiz/${doc._id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-650 hover:bg-indigo-600 border border-indigo-550/20 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Quiz
                    </button>

                    {/* Flashcards link (disabled if not ready) */}
                    <button
                      disabled={doc.status !== 'ready'}
                      onClick={() => navigate(`/flashcards/${doc._id}`)}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700/50 text-slate-200 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Review
                    </button>

                    {/* Delete button */}
                    {!doc.isShared && (
                      <button
                        onClick={() => handleDelete(doc._id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl border border-transparent hover:border-red-500/25 transition-all"
                        title="Delete notes"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-600">
        <p>© 2026 Recall AI. All code files validated for phase execution.</p>
      </footer>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={fetchDocuments}
      />
    </div>
  );
};

export default SubjectView;
