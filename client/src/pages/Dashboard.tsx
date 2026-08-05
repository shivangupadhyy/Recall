import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import UploadModal from '../components/upload/UploadModal';
import { CountUp } from '../components/dashboard/CountUp';
import { StudyHeatmap } from '../components/dashboard/StudyHeatmap';
import { LeaderboardWidget, LeaderboardUser } from '../components/dashboard/LeaderboardWidget';
import { AchievementsWidget, Achievement } from '../components/dashboard/AchievementsWidget';
import { AnalyticsTab } from '../components/dashboard/AnalyticsTab';
import { 
  GraduationCap, LogOut, UploadCloud, Folder, FileText, 
  HelpCircle, Sparkles, BookOpen, Clock, ArrowRight, Brain,
  Flame, Award, Activity, TrendingUp, Lightbulb, CheckCircle2, ChevronRight, X
} from 'lucide-react';
import { motion, AnimatePresence } from '../components/dashboard/framerMotionMock';

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

interface DashboardSummary {
  userName: string;
  collegeName: string;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  studyTime: number; // in seconds
  documentsCount: number;
  subjectsCount: number;
  quizzesAttempted: number;
  avgQuizAccuracy: number;
  flashcardDecksCount: number;
  cardsReviewed: number;
  cardsMastered: number;
  goals: {
    daily: { target: number; current: number };
    weekly: { target: number; current: number };
    monthly: { target: number; current: number };
  };
}

interface ActivityItem {
  id: number;
  activityType: string;
  score: number | null;
  totalQuestions: number | null;
  xpEarned: number;
  createdAt: string;
  docTitle: string | null;
  subject: string | null;
}

interface InsightItem {
  type: 'motivation' | 'weakness' | 'revision' | 'time';
  text: string;
  suggestedAction: string;
}

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'social' | 'achievements'>('overview');
  
  // Basic states
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);

  // New dashboard dynamic stats states
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [social, setSocial] = useState<{ achievements: Achievement[]; leaderboard: LeaderboardUser[] } | null>(null);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Achievement unlock notification banner state
  const [unlockedNotice, setUnlockedNotice] = useState<any | null>(null);

  // Fetch all endpoints
  const fetchDashboardData = async () => {
    try {
      const [summaryRes, analyticsRes, socialRes, insightsRes, recentRes] = await Promise.all([
        api.get('/dashboard/summary'),
        api.get('/dashboard/analytics'),
        api.get('/dashboard/social'),
        api.get('/dashboard/insights'),
        api.get('/dashboard/activity/recent')
      ]);

      setSummary(summaryRes.data);
      setAnalytics(analyticsRes.data);
      setSocial(socialRes.data);
      setInsights(insightsRes.data.insights || []);
      setRecentActivities(recentRes.data.activities || []);
    } catch (err) {
      console.error('Failed to fetch comprehensive dashboard metrics:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  // Fetch documents for the subject groups list
  const fetchDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await api.get('/documents');
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to fetch documents list:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
    fetchDashboardData();
  }, []);

  // Handle uploading doc success triggers
  const handleUploadSuccess = () => {
    fetchDocuments();
    // Re-log an upload activity to award XP!
    api.post('/dashboard/activity', { activityType: 'document_uploaded' })
      .then((res) => {
        // Trigger level-up or badge unlocks
        if (res.data.unlockedAchievements?.length > 0) {
          setUnlockedNotice(res.data.unlockedAchievements[0]);
        }
        fetchDashboardData();
      })
      .catch((e) => console.error(e));
  };

  // Group documents by subject name (preserving existing subject cards flow)
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

  // Formatter helpers
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getPercentage = (current: number, target: number) => {
    return Math.round((current / (target || 1)) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative selection:bg-brand-500 selection:text-white overflow-x-hidden">
      
      {/* Dynamic light glows */}
      <div className="absolute top-0 right-1/4 w-[550px] h-[550px] bg-brand-500/5 rounded-full blur-[140px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-10 left-1/4 w-[650px] h-[650px] bg-indigo-500/5 rounded-full blur-[160px] pointer-events-none translate-y-1/4"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-brand-650 p-2.5 rounded-xl text-white shadow-lg shadow-brand-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Abhyaas <span className="text-brand-400 font-medium text-xs px-2 py-0.5 rounded-full bg-brand-500/10 border border-brand-500/20">AI</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-semibold">{user?.college || 'Study Space'}</p>
          </div>
        </div>

        {/* Global Streak/XP Badges in Navbar */}
        {summary && (
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/10 border border-brand-500/15 rounded-xl text-xs font-black text-brand-450">
              <Flame className="w-4 h-4 fill-brand-450/15" />
              <span>{summary.streak} DAY STREAK</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/15 rounded-xl text-xs font-black text-amber-450">
              <Sparkles className="w-4 h-4" />
              <span>LEVEL {summary.level} ({summary.xp} XP)</span>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-slate-300">
            👋 Hey, {user?.name || 'Student'}
          </span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl border border-slate-800 hover:bg-red-500/10 hover:border-red-500/30 text-slate-400 hover:text-red-400 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Panel Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-10 space-y-8 relative z-10">
        
        {/* Welcome gamified Level Hero */}
        {summary && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 border border-slate-800/80 p-6 md:p-8 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-xl"
          >
            <div className="space-y-3 max-w-xl">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/25">
                <Flame className="w-3.5 h-3.5 text-brand-400" />
                Active Streak: {summary.streak} days
              </div>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">
                Welcome back, {summary.userName}!
              </h2>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                Unlock daily goals and expand your retention curve. All RAG pings and quiz scores are actively synchronized to compute spaced-repetition schedules.
              </p>
              
              <div className="pt-2">
                <button 
                  onClick={() => setUploadOpen(true)}
                  className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-lg shadow-brand-500/15 active:scale-95 transition-all"
                >
                  <UploadCloud className="w-4 h-4" />
                  Upload Study PDF
                </button>
              </div>
            </div>

            {/* Level progression circle widgets */}
            <div className="flex items-center gap-6 bg-slate-950/60 border border-slate-900 p-5 rounded-2xl shrink-0">
              {/* Daily Goal progress ring */}
              <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="40" cy="40" r="32" stroke="#1e293b" strokeWidth="6" fill="transparent" />
                  <circle 
                    cx="40" 
                    cy="40" 
                    r="32" 
                    stroke={brandColorHex(summary.xp, summary.goals.daily.target)} 
                    strokeWidth="6" 
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 32}
                    strokeDashoffset={2 * Math.PI * 32 * (1 - getPercentage(summary.goals.daily.current, summary.goals.daily.target) / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-base font-black text-white">{getPercentage(summary.goals.daily.current, summary.goals.daily.target)}%</span>
                  <span className="text-[7px] text-slate-500 uppercase font-black tracking-wide">Daily Goal</span>
                </div>
              </div>

              {/* Levels values */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-550 uppercase font-bold block">Current XP: {summary.xp} / {summary.goals.daily.target}</span>
                <h4 className="text-base font-extrabold text-white">Academic Level {summary.level}</h4>
                <div className="flex gap-1.5 items-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-500 flex items-center justify-center text-[7px] font-bold text-white">L</span>
                  <p className="text-[10px] text-slate-450 font-semibold leading-tight">Master {Math.round(summary.cardsMastered)} cards to graduate level</p>
                </div>
              </div>

            </div>

          </motion.div>
        )}

        {/* Global tab routing list */}
        <div className="flex border-b border-slate-900 pb-2 overflow-x-auto gap-2">
          {[
            { id: 'overview', name: 'Overview', icon: <Activity className="w-4 h-4" /> },
            { id: 'analytics', name: 'Performance Analytics', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'achievements', name: 'Badges & Milestones', icon: <Award className="w-4 h-4" /> },
            { id: 'social', name: 'Campus Leaderboard', icon: <GraduationCap className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/40 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>

        {/* LOADING SCREEN */}
        {loadingSummary && (
          <div className="flex flex-col items-center justify-center py-28 space-y-4">
            <RefreshCw className="w-10 h-10 text-brand-500 animate-spin" />
            <p className="text-sm text-slate-400 font-medium tracking-wide">Gathering database stats...</p>
          </div>
        )}

        {/* TAB CONTENTS */}
        {!loadingSummary && summary && (
          <AnimatePresence mode="wait">
            
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-8"
              >
                {/* Stats Metrics Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Subjects Count */}
                  <div className="bg-slate-900/60 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between h-32 hover:border-slate-800 transition-colors">
                    <div className="bg-brand-500/10 text-brand-400 p-2.5 rounded-xl w-fit border border-brand-500/10">
                      <Folder className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-white block">
                        <CountUp to={summary.subjectsCount} />
                      </span>
                      <span className="text-[10px] text-slate-505 font-bold uppercase tracking-wide">Unique Subjects</span>
                    </div>
                  </div>

                  {/* Quizzes Count */}
                  <div className="bg-slate-900/60 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between h-32 hover:border-slate-800 transition-colors">
                    <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-xl w-fit border border-indigo-500/10">
                      <HelpCircle className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white block">
                          <CountUp to={summary.quizzesAttempted} />
                        </span>
                        <span className="text-xs text-emerald-450 font-bold">({summary.avgQuizAccuracy}% Acc)</span>
                      </div>
                      <span className="text-[10px] text-slate-505 font-bold uppercase tracking-wide">Quizzes Taken</span>
                    </div>
                  </div>

                  {/* Flashcards Count */}
                  <div className="bg-slate-900/60 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between h-32 hover:border-slate-800 transition-colors">
                    <div className="bg-amber-500/10 text-amber-400 p-2.5 rounded-xl w-fit border border-amber-500/10">
                      <Brain className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-white block">
                          <CountUp to={summary.cardsReviewed} />
                        </span>
                        <span className="text-xs text-amber-450 font-bold">({summary.cardsMastered} box 5)</span>
                      </div>
                      <span className="text-[10px] text-slate-505 font-bold uppercase tracking-wide">Cards Reviewed</span>
                    </div>
                  </div>

                  {/* Study hours Count */}
                  <div className="bg-slate-900/60 border border-slate-850 p-5 rounded-2xl flex flex-col justify-between h-32 hover:border-slate-800 transition-colors">
                    <div className="bg-emerald-500/10 text-emerald-400 p-2.5 rounded-xl w-fit border border-emerald-500/10">
                      <Clock className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <span className="text-2xl font-black text-white block">
                        {formatTime(summary.studyTime)}
                      </span>
                      <span className="text-[10px] text-slate-505 font-bold uppercase tracking-wide">Study Time</span>
                    </div>
                  </div>
                </div>

                {/* Heatmap Row */}
                {analytics?.heatmap && (
                  <StudyHeatmap data={analytics.heatmap} />
                )}

                {/* Main subjects and logs sections */}
                <div className="grid md:grid-cols-12 gap-8 items-stretch">
                  
                  {/* Left Column: Subjects Grid (Existing layout) */}
                  <div className="md:col-span-8 space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                      <BookOpen className="w-4.5 h-4.5 text-brand-400" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">Your Active Subjects</h3>
                    </div>

                    {loadingDocs ? (
                      <div className="text-center py-10 space-y-2">
                        <RefreshCw className="w-6 h-6 text-brand-500 animate-spin mx-auto" />
                        <p className="text-xs text-slate-500">Refreshing subjects...</p>
                      </div>
                    ) : subjectsList.length === 0 ? (
                      <div className="border border-dashed border-slate-850 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-4 bg-slate-950/40">
                        <Folder className="w-10 h-10 text-slate-650" />
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-350 text-sm">No notes folders found</h4>
                          <p className="text-xs text-slate-550 max-w-sm mx-auto">Upload a lecture PDF (e.g. Operating Systems) to populate your dashboard.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid sm:grid-cols-2 gap-4">
                        {subjectsList.map((subject) => (
                          <div
                            key={subject.name}
                            onClick={() => navigate(`/subject/${encodeURIComponent(subject.name)}`)}
                            className="group relative cursor-pointer"
                          >
                            <div className="absolute -inset-px bg-gradient-to-r from-brand-500/10 to-indigo-500/10 rounded-2xl opacity-0 group-hover:opacity-100 blur transition-all duration-300"></div>
                            
                            <div className="relative bg-slate-900/60 border border-slate-855/80 p-5 rounded-2xl flex flex-col justify-between h-36 shadow-sm hover:border-slate-800 transition-all duration-300">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div className="bg-brand-500/10 text-brand-400 p-2.5 rounded-xl border border-brand-500/10">
                                    <Folder className="w-4.5 h-4.5" />
                                  </div>
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-950 border border-slate-850 px-2.5 py-0.5 rounded-full">
                                    {subject.count} PDF{subject.count === 1 ? '' : 's'}
                                  </span>
                                </div>
                                <h4 className="font-extrabold text-white text-sm tracking-tight truncate group-hover:text-brand-350 transition-colors">
                                  {subject.name}
                                </h4>
                              </div>

                              <div className="flex justify-between items-center border-t border-slate-850/60 pt-3 text-[10px] text-slate-505">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-600" />
                                  Active {new Date(subject.lastUpdated).toLocaleDateString()}
                                </span>
                                <span className="font-bold text-brand-400 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all">
                                  Study <ChevronRight className="w-3.5 h-3.5" />
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right Column: AI Insights & Activities */}
                  <div className="md:col-span-4 space-y-6">
                    {/* AI Insights Card */}
                    <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-850/65 pb-3">
                        <Lightbulb className="w-4.5 h-4.5 text-brand-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">AI Study Insights</h4>
                      </div>

                      {insights.length === 0 ? (
                        <p className="text-xs text-slate-550 italic">Analyzing study patterns to construct insights...</p>
                      ) : (
                        <div className="space-y-4">
                          {insights.slice(0, 3).map((insight, idx) => (
                            <div key={idx} className="space-y-1 text-xs">
                              <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                                insight.type === 'weakness' 
                                  ? 'bg-red-500/10 border-red-500/20 text-red-405'
                                  : insight.type === 'revision'
                                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-405'
                                  : 'bg-brand-500/10 border-brand-500/20 text-brand-450'
                              }`}>
                                {insight.type}
                              </span>
                              <p className="text-slate-350 leading-relaxed font-medium">{insight.text}</p>
                              <p className="text-[10px] text-slate-500 italic font-semibold">↳ {insight.suggestedAction}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent Activities List */}
                    <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl space-y-4">
                      <div className="flex items-center gap-2 border-b border-slate-850/65 pb-3">
                        <Activity className="w-4.5 h-4.5 text-brand-400" />
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Recent Activity</h4>
                      </div>

                      {recentActivities.length === 0 ? (
                        <p className="text-xs text-slate-550 italic">No study activities logged yet.</p>
                      ) : (
                        <div className="space-y-4 text-xs">
                          {recentActivities.slice(0, 4).map((activity) => (
                            <div key={activity.id} className="flex justify-between items-start gap-4">
                              <div className="space-y-0.5 min-w-0">
                                <span className="font-extrabold text-white block truncate leading-tight">
                                  {getActivityTitle(activity.activityType, activity.score, activity.totalQuestions)}
                                </span>
                                <span className="text-[10px] text-slate-500 block truncate font-medium">
                                  {activity.docTitle ? `${activity.docTitle} (${activity.subject})` : 'Self-study space'}
                                </span>
                              </div>
                              <span className="text-[10px] font-black text-brand-400 shrink-0">
                                +{activity.xpEarned} XP
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>

                </div>
              </motion.div>
            )}

            {/* ANALYTICS TAB */}
            {activeTab === 'analytics' && analytics && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AnalyticsTab analytics={analytics} />
              </motion.div>
            )}

            {/* ACHIEVEMENTS TAB */}
            {activeTab === 'achievements' && social?.achievements && (
              <motion.div
                key="achievements"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AchievementsWidget data={social.achievements} />
              </motion.div>
            )}

            {/* SOCIAL / LEADERBOARD TAB */}
            {activeTab === 'social' && social?.leaderboard && (
              <motion.div
                key="social"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LeaderboardWidget data={social.leaderboard} />
              </motion.div>
            )}

          </AnimatePresence>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-600">
        <p>© 2026 Abhyaas AI. Redesigned with premium SaaS analytics dashboards.</p>
      </footer>

      {/* Upload Modal */}
      <UploadModal 
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* ACHIEVEMENT UNLOCKED NOTIFICATION MODAL */}
      <AnimatePresence>
        {unlockedNotice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-slate-900 border border-brand-500/30 p-8 rounded-3xl text-center space-y-6 max-w-sm w-full relative shadow-2xl"
            >
              <button 
                onClick={() => setUnlockedNotice(null)}
                className="absolute top-4 right-4 p-1 rounded-xl text-slate-500 hover:text-white hover:bg-slate-950/60 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="relative w-16 h-16 mx-auto flex items-center justify-center bg-gradient-to-br from-yellow-400 to-amber-500 text-white rounded-2xl shadow-lg animate-bounce">
                <Award className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-brand-400 tracking-wider">Achievement Unlocked!</span>
                <h3 className="text-xl font-black text-white">{unlockedNotice.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{unlockedNotice.desc}</p>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850 inline-flex items-center gap-1.5 text-xs font-extrabold text-amber-450">
                <Sparkles className="w-4 h-4" />
                <span>+{unlockedNotice.bonusXp} XP Reward Badge</span>
              </div>

              <div>
                <button
                  onClick={() => setUnlockedNotice(null)}
                  className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl active:scale-98 transition-all"
                >
                  Great, Thanks!
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Quick helper to determine brand colors for Progress Rings dynamically
const brandColorHex = (xp: number, target: number) => {
  const percent = (xp / (target || 1)) * 100;
  if (percent >= 100) return '#10b981'; // completed: emerald
  return '#8b5cf6'; // default purple
};

// Activity log titles mapper helper
const getActivityTitle = (type: string, score: number | null, total: number | null) => {
  switch (type) {
    case 'document_uploaded':
      return '📁 Study PDF Uploaded';
    case 'quiz_completed':
      return `📝 Quiz Attempted (${score}/${total})`;
    case 'flashcards_reviewed':
      return '🧠 Active Recall Reviewed';
    case 'chat_message_sent':
      return '💬 AI Tutor Doubt Solved';
    default:
      return '📚 Study Session Logged';
  }
};

export default Dashboard;
