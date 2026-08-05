import React from 'react';
import { Award, Lock, CheckCircle2, Star, Flame, GraduationCap, Brain, Sparkles, BookOpen } from 'lucide-react';
import { motion } from './framerMotionMock';

export interface Achievement {
  id: string;
  name: string;
  desc: string;
  xp: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementsWidgetProps {
  data: Achievement[];
}

export const AchievementsWidget: React.FC<AchievementsWidgetProps> = ({ data }) => {
  // Map achievement IDs to custom icons/styles for rich gamified aesthetics
  const getBadgeConfig = (id: string) => {
    switch (id) {
      case 'first_upload':
        return {
          icon: <GraduationCap className="w-5 h-5" />,
          color: 'from-amber-500 to-orange-600 shadow-orange-500/10',
          borderColor: 'border-orange-500/20'
        };
      case 'first_quiz':
        return {
          icon: <Sparkles className="w-5 h-5" />,
          color: 'from-blue-500 to-indigo-600 shadow-blue-500/10',
          borderColor: 'border-blue-500/20'
        };
      case 'first_flashcards':
        return {
          icon: <Brain className="w-5 h-5" />,
          color: 'from-violet-500 to-fuchsia-600 shadow-violet-500/10',
          borderColor: 'border-violet-500/20'
        };
      case 'streak_3':
        return {
          icon: <Flame className="w-5 h-5" />,
          color: 'from-red-500 to-rose-600 shadow-red-500/10',
          borderColor: 'border-red-500/20'
        };
      case 'streak_7':
        return {
          icon: <Flame className="w-5 h-5" />,
          color: 'from-rose-650 to-pink-700 shadow-rose-650/10',
          borderColor: 'border-rose-650/20'
        };
      case 'perfectionist':
        return {
          icon: <Star className="w-5 h-5" />,
          color: 'from-yellow-400 to-amber-500 shadow-yellow-500/10',
          borderColor: 'border-yellow-400/20'
        };
      case 'academic_scholar':
        return {
          icon: <BookOpen className="w-5 h-5" />,
          color: 'from-emerald-500 to-teal-600 shadow-emerald-500/10',
          borderColor: 'border-emerald-500/20'
        };
      default:
        return {
          icon: <Award className="w-5 h-5" />,
          color: 'from-slate-600 to-slate-700 shadow-slate-500/10',
          borderColor: 'border-slate-500/20'
        };
    }
  };

  return (
    <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl backdrop-blur-sm space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-brand-400" />
            <h4 className="text-sm font-extrabold text-white">Study Milestones</h4>
          </div>
          <p className="text-xs text-slate-500">Track and unlock rewards as you study</p>
        </div>

        <span className="text-[10px] font-bold bg-brand-500/10 border border-brand-500/15 px-2.5 py-1 rounded-xl text-brand-400 uppercase tracking-wide">
          {data.filter((a) => a.unlocked).length} / {data.length} Unlocked
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {data.map((ach, idx) => {
          const config = getBadgeConfig(ach.id);
          return (
            <motion.div
              key={ach.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${
                ach.unlocked
                  ? `bg-slate-950/40 border-slate-900 ${config.borderColor} shadow-lg hover:border-slate-800`
                  : 'bg-slate-950/20 border-slate-950/40 opacity-50'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                {/* Badge Icon Grid */}
                <div className={`w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-white shadow-md bg-gradient-to-br ${
                  ach.unlocked ? config.color : 'from-slate-800 to-slate-900'
                }`}>
                  {ach.unlocked ? config.icon : <Lock className="w-4 h-4 text-slate-650" />}
                </div>

                <div className="min-w-0">
                  <span className="font-extrabold text-sm text-white block leading-tight">
                    {ach.name}
                  </span>
                  <span className="text-[10px] text-slate-500 font-semibold block leading-tight mt-0.5 max-w-[200px] truncate">
                    {ach.desc}
                  </span>
                  <span className="text-[9px] text-brand-450 font-bold mt-1 block">
                    +{ach.xp} XP Bonus
                  </span>
                </div>
              </div>

              {/* Status Mark */}
              <div className="shrink-0">
                {ach.unlocked ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-500/10" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-800" />
                )}
              </div>

            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default AchievementsWidget;
