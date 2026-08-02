import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SubjectView from './pages/SubjectView';
import { Loader2 } from 'lucide-react';

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
        <p className="text-sm text-slate-400 font-medium tracking-wide">Syncing study companion profile...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Public Route Guard (Redirect to dashboard if logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-10 h-10 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

// Phase 3-5 Skeleton Placeholders to prevent router crashes
const FeatureSkeleton: React.FC<{ title: string; phase: string }> = ({ title, phase }) => {
  const { user } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-sm text-slate-400 hover:text-white transition-all">← Dashboard</Link>
        <span className="text-xs font-semibold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
          👋 Hey, {user?.name}
        </span>
      </header>
      <main className="flex-1 max-w-xl w-full mx-auto p-6 flex flex-col justify-center text-center space-y-4">
        <div className="bg-brand-500/10 text-brand-400 p-4 rounded-full border border-brand-500/15 w-fit mx-auto animate-bounce">
          <Loader2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">{title}</h2>
        <p className="text-sm text-slate-400 leading-relaxed">
          This feature is scheduled for implementation in <strong className="text-brand-400">{phase}</strong> of the project timeline.
        </p>
        <div className="pt-4">
          <Link to="/" className="inline-flex items-center justify-center px-5 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold rounded-xl transition-all">
            Return to Dashboard
          </Link>
        </div>
      </main>
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-650">
        <p>© 2026 Abhyaas AI.</p>
      </footer>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Screen */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            } 
          />

          {/* Protected Main Workspace */}
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />

          {/* Protected Subject Materials Explorer */}
          <Route 
            path="/subject/:subjectName" 
            element={
              <ProtectedRoute>
                <SubjectView />
              </ProtectedRoute>
            } 
          />

          {/* Future Phased Routings (Skeleton Guards) */}
          <Route 
            path="/chat/:docId" 
            element={
              <ProtectedRoute>
                <FeatureSkeleton title="RAG Doubt-Solving Chat" phase="Phase 3" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quiz/:docId" 
            element={
              <ProtectedRoute>
                <FeatureSkeleton title="AI MCQ Quiz Generator" phase="Phase 4" />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/flashcards/:docId" 
            element={
              <ProtectedRoute>
                <FeatureSkeleton title="AI Spaced-Repetition Flashcards" phase="Phase 5" />
              </ProtectedRoute>
            } 
          />

          {/* Default Routing */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
