import React from 'react';
import { Trophy, Shield, Medal, Star } from 'lucide-react';
import { motion } from './framerMotionMock';

export interface LeaderboardUser {
  rank: number;
  name: string;
  college: string;
  level: number;
  xp: number;
  isCurrentUser: boolean;
}

interface LeaderboardWidgetProps {
  data: LeaderboardUser[];
}

export const LeaderboardWidget: React.FC<LeaderboardWidgetProps> = ({ data }) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-5 h-5 text-amber-400 drop-shadow-glow" />;
      case 2:
        return <Shield className="w-5 h-5 text-slate-350" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-xs text-slate-500 font-bold w-5 text-center">{rank}</span>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="bg-slate-900/40 border border-slate-850 p-6 rounded-3xl backdrop-blur-sm space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-brand-400" />
          <h4 className="text-sm font-extrabold text-white">Academic Leaderboard</h4>
        </div>
        <p className="text-xs text-slate-500">Compete with peer students across campuses</p>
      </div>

      <div className="space-y-3">
        {data.map((user, idx) => (
          <motion.div
            key={user.name + idx}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all ${
              user.isCurrentUser
                ? 'bg-brand-500/10 border-brand-500/35 shadow-md shadow-brand-500/5'
                : 'bg-slate-950/40 border-slate-900 hover:border-slate-800'
            }`}
          >
            {/* Glow accent for current user */}
            {user.isCurrentUser && (
              <span className="absolute -left-px top-1/4 bottom-1/4 w-1 bg-brand-500 rounded-r-md"></span>
            )}

            <div className="flex items-center gap-4 min-w-0">
              {/* Rank Icon / Number */}
              <div className="shrink-0 flex justify-center w-6">
                {getRankIcon(user.rank)}
              </div>

              {/* Avatar */}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                user.isCurrentUser 
                  ? 'bg-brand-650 text-white shadow-md' 
                  : 'bg-slate-900 text-slate-350 border border-slate-850'
              }`}>
                {getInitials(user.name)}
              </div>

              {/* Text metadata */}
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-white truncate block">
                    {user.name}
                  </span>
                  {user.isCurrentUser && (
                    <span className="text-[9px] font-black uppercase bg-brand-500/20 text-brand-400 px-1.5 py-0.5 rounded-md border border-brand-500/10">
                      You
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500 font-semibold block truncate">
                  {user.college}
                </span>
              </div>
            </div>

            {/* Level / XP stats */}
            <div className="text-right shrink-0 flex items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-black text-white">{user.xp.toLocaleString()} XP</span>
                <span className="text-[10px] text-slate-550 font-bold">Level {user.level}</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-brand-500/50"></div>
            </div>

          </motion.div>
        ))}
      </div>

      {/* Pro tip / note */}
      <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-2xl flex items-start gap-2.5">
        <Star className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
        <p className="text-[10px] text-slate-500 leading-relaxed">
          <strong>XP Multipliers:</strong> Completing Quizzes with 100% accuracy awards double XP bonuses. Streaks add dynamic multipliers on active recall sessions.
        </p>
      </div>

    </div>
  );
};

export default LeaderboardWidget;
