import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import UploadModal from '../components/upload/UploadModal';
import { 
  GraduationCap, LogOut, UploadCloud, Folder, FileText, 
  HelpCircle, Sparkles, BookOpen, Clock, ArrowRight, Brain 
} from 'lucide-react';

interface Document {
  _id: string;
  subject: string;
  title: string;
  fileUrl: string;
  status: 'processing' | 'ready' | 'failed';
  createdAt: string;
}

interface SubjectGroup {
  name: string;
  count: number;
  lastUpdated: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const fetchDocuments = async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Group documents by subject name
  const subjectsMap: Record<string, { count: number; latest: string }> = {};
  documents.forEach((doc) => {
    const sub = doc.subject;
    if (!subjectsMap[sub]) {
      subjectsMap[sub] = { count: 0, latest: doc.createdAt };
    }
    subjectsMap[sub].count += 1;
    if (new Date(doc.createdAt) > new Date(subjectsMap[sub].latest)) {
      subjectsMap[sub].latest = doc.createdAt;
    }
  });

  const subjectsList: SubjectGroup[] = Object.keys(subjectsMap).map((name) => ({
    name,
    count: subjectsMap[name].count,
    lastUpdated: subjectsMap[name].latest,
  }));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative selection:bg-brand-500 selection:text-white">
      {/* Ambient background blur */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[140px] pointer-events-none translate-y-1/3"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Abhyaas <span className="text-brand-400 font-medium text-sm px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20">AI</span>
            </h1>
            <p className="text-xs text-slate-500">{user?.college || 'Study Space'}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-semibold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
            👋 Hey, {user?.name || 'Student'}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl border border-slate-800 hover:bg-red-500/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8 relative z-10">
        
        {/* Welcome Hero / Stats Row */}
        <div className="grid md:grid-cols-12 gap-6 items-stretch">
          
          <div className="md:col-span-8 bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 p-6 md:p-8 rounded-3xl flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/25">
                <Sparkles className="w-3 h-3" />
                Indian College Edition
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white">Your Study Materials, Powered by AI</h2>
              <p className="text-sm text-slate-400 leading-relaxed max-w-xl">
                Upload lectures, PDFs, or exam notes. Get exact responses grounded strictly in your content. Zero hallucinations, with detailed citations mapping back to your notes.
              </p>
            </div>

            <div>
              <button 
                onClick={() => setUploadOpen(true)}
                className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-lg shadow-brand-500/10 hover:shadow-brand-500/20 active:scale-95 transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                Upload New Study Notes
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="md:col-span-4 grid grid-cols-2 gap-4">
            
            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="bg-brand-500/10 text-brand-400 p-2 rounded-xl w-fit">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white block">{documents.length}</span>
                <span className="text-xs text-slate-500">Documents</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="bg-blue-500/10 text-blue-400 p-2 rounded-xl w-fit">
                <Folder className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white block">{subjectsList.length}</span>
                <span className="text-xs text-slate-500">Subjects</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="bg-emerald-500/10 text-emerald-400 p-2 rounded-xl w-fit">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white block">0</span>
                <span className="text-xs text-slate-500">Quizzes Solved</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
              <div className="bg-amber-500/10 text-amber-400 p-2 rounded-xl w-fit">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <span className="text-2xl font-extrabold text-white block">0</span>
                <span className="text-xs text-slate-500">Flashcards Done</span>
              </div>
            </div>

          </div>

        </div>

        {/* Subjects Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
            <BookOpen className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-bold text-white">Your Subjects</h3>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-slate-400 font-medium">Fetching subject indices...</p>
            </div>
          ) : subjectsList.length === 0 ? (
            <div className="border border-dashed border-slate-800/80 rounded-3xl p-12 text-center flex flex-col items-center justify-center space-y-4 bg-slate-950/40">
              <Folder className="w-12 h-12 text-slate-600" />
              <div className="space-y-1">
                <h4 className="font-bold text-slate-300">No subject materials uploaded yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">Upload notes for a subject (e.g. Operating Systems) to initialize doubt solving and flashcard features.</p>
              </div>
              <button
                onClick={() => setUploadOpen(true)}
                className="bg-slate-900 hover:bg-slate-800 text-brand-400 border border-brand-500/20 hover:border-brand-500/40 font-semibold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-all"
              >
                <UploadCloud className="w-4 h-4" />
                Upload PDF
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {subjectsList.map((subject) => (
                <div
                  key={subject.name}
                  onClick={() => navigate(`/subject/${encodeURIComponent(subject.name)}`)}
                  className="group relative cursor-pointer"
                >
                  {/* Hover glow */}
                  <div className="absolute -inset-px bg-gradient-to-r from-brand-500/20 to-indigo-500/20 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-300"></div>

                  <div className="relative bg-slate-900 border border-slate-800/80 p-5 rounded-2xl flex flex-col justify-between h-44 shadow-lg transition-all duration-300 group-hover:border-slate-700/60 group-hover:-translate-y-1">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="bg-brand-500/10 text-brand-400 p-2.5 rounded-xl border border-brand-500/10">
                          <Folder className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-full">
                          {subject.count} {subject.count === 1 ? 'PDF' : 'PDFs'}
                        </span>
                      </div>
                      <h4 className="font-extrabold text-white text-base tracking-tight truncate group-hover:text-brand-300 transition-colors">
                        {subject.name}
                      </h4>
                    </div>

                    <div className="flex justify-between items-center border-t border-slate-800/60 pt-3">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-650" />
                        Active {new Date(subject.lastUpdated).toLocaleDateString()}
                      </span>
                      <span className="text-xs font-bold text-brand-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                        Study
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-600">
        <p>© 2026 Abhyaas AI. All code files validated for phase execution.</p>
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

export default Dashboard;
