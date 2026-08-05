import React, { useState } from 'react';
import { HelpCircle, Check, X, RefreshCw, Bookmark } from 'lucide-react';

export interface Card {
  id: number;
  front: string;
  back: string;
  box: number;
  lastReviewed: string | null;
  nextReviewDate: string | null;
}

interface FlashcardContainerProps {
  card: Card;
  onRateCard: (knowsIt: boolean) => void;
}

export const FlashcardContainer: React.FC<FlashcardContainerProps> = ({ card, onRateCard }) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleCardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleActionClick = (e: React.MouseEvent, knowsIt: boolean) => {
    e.stopPropagation(); // Prevent card from flipping back when clicking action buttons
    setIsFlipped(false);
    // Add small delay to let the flip animation finish before loading the next card
    setTimeout(() => {
      onRateCard(knowsIt);
    }, 250);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center space-y-8 select-none">
      
      {/* Leitner Box Status Indicator */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-4 py-2 rounded-2xl shadow-sm text-xs font-semibold text-slate-300">
        <Bookmark className="w-3.5 h-3.5 text-brand-400" />
        <span>Card Box Level:</span>
        <div className="flex gap-1.5 ml-1">
          {[1, 2, 3, 4, 5].map((level) => (
            <div
              key={level}
              title={`Box ${level}`}
              className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold border transition-all ${
                card.box >= level
                  ? 'bg-brand-500/20 border-brand-500/40 text-brand-350'
                  : 'bg-slate-950 border-slate-850 text-slate-600'
              }`}
            >
              {level}
            </div>
          ))}
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div 
        onClick={handleCardClick}
        className="perspective-1000 w-full h-[320px] relative cursor-pointer"
      >
        <div 
          className={`w-full h-full duration-500 preserve-3d relative transition-transform ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
        >
          
          {/* FRONT SIDE (Question) */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800/80 hover:border-slate-700/60 rounded-3xl p-8 flex flex-col justify-between shadow-xl transition-colors">
            {/* Top Row */}
            <div className="flex justify-between items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase tracking-wider">
                <HelpCircle className="w-3 h-3" />
                Prompt / Question
              </span>
              <span className="text-xs text-slate-500 font-medium">Click to flip</span>
            </div>

            {/* Main Text Content */}
            <div className="flex-1 flex items-center justify-center text-center py-4">
              <h3 className="text-lg md:text-xl font-bold text-white leading-relaxed tracking-tight max-w-md">
                {card.front}
              </h3>
            </div>

            {/* Bottom Row */}
            <div className="flex justify-center items-center gap-1.5 text-xs text-slate-500 font-medium">
              <RefreshCw className="w-3.5 h-3.5 animate-pulse text-brand-500/40" />
              <span>Tap card to reveal answer</span>
            </div>
          </div>

          {/* BACK SIDE (Answer) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 bg-gradient-to-br from-slate-900 to-slate-950 border border-brand-500/20 rounded-3xl p-8 flex flex-col justify-between shadow-xl shadow-brand-500/5">
            {/* Top Row */}
            <div className="flex justify-between items-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                <Check className="w-3 h-3" />
                Answer / Explanation
              </span>
              <span className="text-xs text-slate-500 font-medium">Click to flip</span>
            </div>

            {/* Main Text Content */}
            <div className="flex-1 flex items-center justify-center text-center py-4 overflow-y-auto px-2">
              <p className="text-sm md:text-base text-slate-200 leading-relaxed font-medium max-w-md">
                {card.back}
              </p>
            </div>

            {/* Bottom Row */}
            <div className="flex justify-center items-center gap-1.5 text-xs text-slate-500 font-medium">
              <RefreshCw className="w-3.5 h-3.5 text-slate-650" />
              <span>Tap card to show question</span>
            </div>
          </div>

        </div>
      </div>

      {/* Spaced-Repetition Feedback Controls */}
      <div className="w-full flex justify-center gap-4">
        {!isFlipped ? (
          <button
            onClick={handleCardClick}
            className="w-full max-w-[200px] inline-flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-500/10 hover:shadow-brand-500/25 active:scale-98 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Reveal Answer
          </button>
        ) : (
          <div className="w-full max-w-md flex justify-center gap-4">
            
            {/* Don't Know Button */}
            <button
              onClick={(e) => handleActionClick(e, false)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 bg-slate-900 border border-slate-800 hover:bg-red-500/10 hover:border-red-500/25 text-slate-350 hover:text-red-400 text-sm font-bold rounded-2xl shadow-sm active:scale-98 transition-all"
              title="Return to Box 1 for review today"
            >
              <X className="w-4 h-4 text-red-500" />
              Don't Know It
            </button>

            {/* Know It Button */}
            <button
              onClick={(e) => handleActionClick(e, true)}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-500/10 hover:shadow-brand-500/25 active:scale-98 transition-all"
              title="Advance to next Leitner Box"
            >
              <Check className="w-4 h-4 text-white" />
              Know It
            </button>
            
          </div>
        )}
      </div>

    </div>
  );
};
