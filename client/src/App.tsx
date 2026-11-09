import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import SubjectView from './pages/SubjectView';
import ChatPage from './pages/ChatPage';
import QuizPage from './pages/QuizPage';
import FlashcardsPage from './pages/FlashcardsPage';
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
                <ChatPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quiz/:docId" 
            element={
              <ProtectedRoute>
                <QuizPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/flashcards/:docId" 
            element={
              <ProtectedRoute>
                <FlashcardsPage />
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
