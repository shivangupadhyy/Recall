import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, BarChart, Bar, Legend, Cell
} from 'recharts';
import { BookOpen, RefreshCw, BarChart2, Flame, Award } from 'lucide-react';
import { motion } from './framerMotionMock';

interface WeeklyTime {
  day: string;
  minutes: number;
}

interface QuizTrend {
  index: number;
  accuracy: number;
  date: string;
}

interface SubjectPerformance {
  subject: string;
  accuracy: number;
  quizzesTaken: number;
}

interface RetentionBox {
  box: string;
  count: number;
}

interface AnalyticsData {
  weeklyStudyTime: WeeklyTime[];
  quizTrend: QuizTrend[];
  subjectPerformance: SubjectPerformance[];
  retentionDistribution: RetentionBox[];
}

interface AnalyticsTabProps {
  analytics: AnalyticsData;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ analytics }) => {
  const brandPurple = '#8b5cf6';
  const brandIndigo = '#6366f1';
  const brandEmerald = '#10b981';

  // Custom tooltips
  const CustomTooltip = ({ active, payload, label, suffix = '' }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-slate-800 p-3 rounded-xl shadow-xl text-xs">
          <p className="font-extrabold text-white mb-1">{label}</p>
          <p className="text-brand-400 font-semibold">
            {payload[0].value} {suffix}
          </p>
        </div>
      );
    }
    return null;
  };

  const hasSubjectPerformance = analytics.subjectPerformance.length > 0;
  const hasQuizTrend = analytics.quizTrend.length > 0;

  return (
    <div className="space-y-8">
      
      {/* Top Row: Weekly Study & Subject Strengths */}
      <div className="grid md:grid-cols-12 gap-6 items-stretch">
        
        {/* Weekly Study Time (Area Chart) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-8 bg-slate-900/40 border border-slate-850 p-6 rounded-3xl backdrop-blur-sm flex flex-col justify-between h-[360px]"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-brand-400" />
                Weekly Study Time
              </h4>
              <p className="text-xs text-slate-500">Minutes spent in active learning sessions</p>
            </div>
          </div>

          <div className="flex-1 w-full h-full min-h-0 text-[10px]">
            <ResponsiveContainer width="100%" height="105%">
              <AreaChart data={analytics.weeklyStudyTime} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={brandPurple} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={brandPurple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/30" />
                <XAxis dataKey="day" stroke="#475569" fontStyle="bold" />
                <YAxis stroke="#475569" fontStyle="bold" />
                <Tooltip content={<CustomTooltip suffix="mins" />} />
                <Area 
                  type="monotone" 
                  dataKey="minutes" 
                  stroke={brandPurple} 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorMinutes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Subject Performance (Radar Chart) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-4 bg-slate-900/40 border border-slate-850 p-6 rounded-3xl backdrop-blur-sm flex flex-col justify-between h-[360px]"
        >
          <div className="mb-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Subject Strengths
            </h4>
            <p className="text-xs text-slate-500">Average accuracy across subjects</p>
          </div>

          {hasSubjectPerformance ? (
            <div className="flex-1 w-full h-full min-h-0 text-[9px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" radius="70%" data={analytics.subjectPerformance}>
                  <PolarGrid stroke="#334155/60" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" />
                  <Radar
                    name="Accuracy"
                    dataKey="accuracy"
                    stroke={brandIndigo}
                    fill={brandIndigo}
                    fillOpacity={0.2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
              <BookOpen className="w-8 h-8 text-slate-750 mb-2" />
              <p className="text-xs text-slate-500 max-w-[180px]">No quiz attempts logged yet. Subjects stats will populate as you solve quizzes.</p>
            </div>
          )}
        </motion.div>

      </div>

      {/* Bottom Row: Quiz Accuracy progression & Flashcard Box Retention */}
      <div className="grid md:grid-cols-12 gap-6 items-stretch">
        
        {/* Quiz Accuracy Trend Line */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-6 bg-slate-900/40 border border-slate-850 p-6 rounded-3xl backdrop-blur-sm flex flex-col justify-between h-[340px]"
        >
          <div className="mb-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-450" />
              Quiz Progress Trend
            </h4>
            <p className="text-xs text-slate-500">Accuracy percentages across the last 10 quizzes</p>
          </div>

          {hasQuizTrend ? (
            <div className="flex-1 w-full h-full min-h-0 text-[10px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.quizTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/30" />
                  <XAxis dataKey="date" stroke="#475569" />
                  <YAxis domain={[0, 100]} stroke="#475569" />
                  <Tooltip content={<CustomTooltip suffix="%" />} />
                  <Line 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke={brandEmerald} 
                    strokeWidth={3} 
                    activeDot={{ r: 6 }} 
                    dot={{ strokeWidth: 2, r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <Award className="w-8 h-8 text-slate-750 mb-2" />
              <p className="text-xs text-slate-500 max-w-sm">No quizzes solved yet. Solve quizzes on subjects to visualize your academic learning curves.</p>
            </div>
          )}
        </motion.div>

        {/* Flashcard Box Distribution (Bar Chart) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-6 bg-slate-900/40 border border-slate-850 p-6 rounded-3xl backdrop-blur-sm flex flex-col justify-between h-[340px]"
        >
          <div className="mb-4">
            <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-brand-400" />
              Memory Retention Curve
            </h4>
            <p className="text-xs text-slate-500">Card distribution across Leitner Spaced-Repetition Boxes</p>
          </div>

          <div className="flex-1 w-full h-full min-h-0 text-[10px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.retentionDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b/30" />
                <XAxis dataKey="box" stroke="#475569" fontStyle="bold" />
                <YAxis stroke="#475569" fontStyle="bold" />
                <Tooltip content={<CustomTooltip suffix="cards" />} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {analytics.retentionDistribution.map((entry, index) => {
                    // Visual gradient: lighter boxes (Box 5) represent fully mastered cards
                    const colors = [
                      '#4f46e5', // Box 1
                      '#6366f1', // Box 2
                      '#8b5cf6', // Box 3
                      '#a78bfa', // Box 4
                      '#10b981'  // Box 5 (Mastered)
                    ];
                    return <Cell key={`cell-${index}`} fill={colors[index] || brandPurple} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

      </div>

    </div>
  );
};

export default AnalyticsTab;
