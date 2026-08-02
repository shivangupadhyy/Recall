import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import { GraduationCap, BookOpen, Brain, Sparkles } from 'lucide-react';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleAuthSuccess = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background ambient highlights */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/3 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none translate-y-1/3 -translate-x-1/3"></div>

      <div className="w-full max-w-5xl grid md:grid-cols-12 bg-slate-900/40 backdrop-blur-xl border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl relative z-10">
        
        {/* Left Side: Product Intro Panel (Hidden on mobile) */}
        <div className="md:col-span-6 bg-slate-900/60 p-8 md:p-12 flex flex-col justify-between border-r border-slate-800/50">
          <div className="flex items-center gap-2">
            <div className="bg-brand-600 p-2 rounded-xl text-white shadow-lg shadow-brand-500/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Abhyaas <span className="text-brand-400 font-medium text-sm px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20">AI</span>
            </h1>
          </div>

          <div className="my-12 space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight leading-tight">
              Your AI-Powered <br />
              <span className="bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">Personal Study Buddy</span>
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Designed specifically for Indian college curricula. Upload notes, slides, or syllabus sheets to generate interactive self-study resources in seconds.
            </p>

            {/* Micro Feature List */}
            <div className="space-y-4 pt-4">
              <div className="flex gap-3">
                <div className="mt-1 bg-brand-500/10 p-1.5 rounded-lg border border-brand-500/20 text-brand-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">Anti-Hallucination RAG Chat</h4>
                  <p className="text-xs text-slate-500">Answers doubts strictly using your uploaded PDFs, complete with exact source page numbers.</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="mt-1 bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20 text-indigo-400">
                  <Brain className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-200">AI MCQ & Flashcard Generator</h4>
                  <p className="text-xs text-slate-500">Auto-generates custom syllabus quizzes and smart review cards to streamline exam prep.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Secure, encrypted JWT credentials</span>
          </div>
        </div>

        {/* Right Side: Authentication Forms */}
        <div className="md:col-span-6 p-8 md:p-12 flex flex-col justify-center bg-slate-950/20">
          <div className="w-full max-w-sm mx-auto space-y-6">
            
            {/* Header / Tabs */}
            <div className="text-center md:text-left space-y-2">
              <h3 className="text-2xl font-bold text-white tracking-tight">
                {isLogin ? 'Welcome back!' : 'Create your account'}
              </h3>
              <p className="text-sm text-slate-400">
                {isLogin ? "Ready to dive back into your notes?" : "Let's set up your study dashboard."}
              </p>
            </div>

            {/* Sliding Tab Selector */}
            <div className="bg-slate-900 border border-slate-800 p-1 rounded-xl flex">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                  isLogin
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all ${
                  !isLogin
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Active Form */}
            {isLogin ? (
              <LoginForm onSuccess={handleAuthSuccess} />
            ) : (
              <SignupForm onSuccess={handleAuthSuccess} />
            )}

            {/* Bottom Redirect Link */}
            <p className="text-xs text-slate-500 text-center">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-brand-400 hover:text-brand-300 font-semibold underline transition-all focus:outline-none"
              >
                {isLogin ? 'Register now' : 'Sign in'}
              </button>
            </p>

          </div>
        </div>

      </div>
    </div>
  );
};

export default AuthPage;
