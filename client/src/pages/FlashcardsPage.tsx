import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { Card, FlashcardContainer } from '../components/flashcards/FlashcardContainer';
import { 
  ArrowLeft, Brain, Sparkles, RefreshCw, AlertCircle, 
  Flame, Inbox, Award, Play 
} from 'lucide-react';

export const FlashcardsPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  
  // State variables
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<'ready' | 'generating' | 'not_generated'>('not_generated');
  const [cards, setCards] = useState<Card[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Session variables
  const [reviewMode, setReviewMode] = useState<'due' | 'all'>('due');
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);

  // Fetch flashcard deck status and data
  const fetchFlashcards = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/flashcards/${docId}`);
      setStatus(res.data.status);
      if (res.data.status === 'ready') {
        setCards(res.data.cards || []);
      }
    } catch (err: any) {
      console.error('Failed to fetch flashcards:', err);
      setError(err.response?.data?.error || 'Failed to retrieve flashcard deck.');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlashcards();
  }, [docId]);

  // Poll server if current status is generating
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (status === 'generating') {
      intervalId = setInterval(() => {
        fetchFlashcards(false);
      }, 4000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [status]);

  // Set up the session cards whenever the main deck (cards) or review mode changes
  useEffect(() => {
    if (cards.length > 0) {
      if (reviewMode === 'due') {
        const now = new Date();
        const dueCards = cards.filter(card => {
          if (!card.nextReviewDate) return true; // New cards are due
          return new Date(card.nextReviewDate) <= now;
        });
        setSessionCards(dueCards);
      } else {
        setSessionCards(cards);
      }
      setCurrentIndex(0);
      setSessionCompleted(false);
      setSessionReviewedCount(0);
    }
  }, [cards, reviewMode]);

  // Trigger deck generation
  const handleGenerateDeck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post(`/flashcards/generate/${docId}`);
      setStatus(res.data.status);
    } catch (err: any) {
      console.error('Failed to trigger flashcard generation:', err);
      setError(err.response?.data?.error || 'Failed to start generation. Make sure document parsed text is ready.');
      setLoading(false);
    }
  };

  // Leitner Spaced-Repetition System math logic
  const handleRateCard = async (knowsIt: boolean) => {
    if (sessionCards.length === 0) return;

    const currentCard = sessionCards[currentIndex];
    
    // 1. Compute new box number
    let newBox = currentCard.box;
    if (knowsIt) {
      newBox = Math.min(currentCard.box + 1, 5);
    } else {
      newBox = 1; // Demote all the way back to box 1 on failure
    }

    // 2. Compute next review date offset
    const now = new Date();
    let daysToAdd = 1;
    switch (newBox) {
      case 1: daysToAdd = 1; break;
      case 2: daysToAdd = 2; break;
      case 3: daysToAdd = 4; break;
      case 4: daysToAdd = 7; break;
      case 5: daysToAdd = 14; break;
    }
    const nextReviewDate = new Date();
    nextReviewDate.setDate(now.getDate() + daysToAdd);

    // 3. Update the specific card in the state
    const updatedCards = cards.map(c => {
      if (c.id === currentCard.id) {
        return {
          ...c,
          box: newBox,
          lastReviewed: now.toISOString(),
          nextReviewDate: nextReviewDate.toISOString()
        };
      }
      return c;
    });

    // 4. Save updated list back to the server (optimistic UI update)
    setCards(updatedCards);
    setSessionReviewedCount(prev => prev + 1);

    try {
      await api.put(`/flashcards/${docId}`, { cards: updatedCards });
    } catch (err) {
      console.error('Failed to save flashcards progress on server:', err);
      // Fail silently or notify user - progress remains in local memory for session
    }

    // 5. Navigate to the next card or end session
    if (currentIndex + 1 < sessionCards.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setSessionCompleted(true);
      // Log flashcard activity to award XP in dashboard
      api.post('/dashboard/activity', {
        activityType: 'flashcards_reviewed',
        documentId: parseInt(docId || '', 10),
        cardsReviewed: sessionCards.length
      }).catch(err => console.error('Failed to log flashcard activity:', err));
    }
  };

  // Reset progress of all cards back to Box 1
  const handleResetProgress = async () => {
    if (!window.confirm('Are you sure you want to reset all review histories for this deck? All cards will go back to Box 1.')) {
      return;
    }
    
    const resetCards = cards.map(c => ({
      ...c,
      box: 1,
      lastReviewed: null,
      nextReviewDate: null
    }));

    setCards(resetCards);
    setSessionCompleted(false);
    setCurrentIndex(0);

    try {
      await api.put(`/flashcards/${docId}`, { cards: resetCards });
    } catch (err) {
      console.error('Failed to reset flashcard progress:', err);
      alert('Error updating progress on server. Please try again.');
    }
  };

  // Get distribution of boxes for stats widget
  const boxCounts = [0, 0, 0, 0, 0];
  cards.forEach(c => {
    const boxIdx = Math.min(Math.max(c.box - 1, 0), 4);
    boxCounts[boxIdx]++;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative selection:bg-brand-500 selection:text-white">
      {/* Glow effects */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all py-1.5 px-3 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-brand-400" />
          <h1 className="text-sm font-extrabold tracking-tight text-white uppercase">
            Spaced Repetition Cards
          </h1>
        </div>

        <div className="w-20"></div> {/* Spacer to align title */}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-10 flex flex-col justify-center relative z-10">
        
        {/* Loading Spinner */}
        {loading && status !== 'generating' && (
          <div className="text-center py-20 space-y-4">
            <RefreshCw className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
            <p className="text-sm text-slate-400 font-medium">Syncing flashcard records...</p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl max-w-md mx-auto text-center space-y-4">
            <AlertCircle className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
            <button
              onClick={() => fetchFlashcards()}
              className="px-4 py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl text-xs font-bold text-slate-350"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* NOT GENERATED SCREEN */}
        {!loading && status === 'not_generated' && !error && (
          <div className="max-w-md w-full mx-auto bg-slate-900/60 border border-slate-850 p-8 rounded-3xl text-center space-y-6 shadow-xl">
            <div className="bg-brand-500/10 text-brand-400 p-4 rounded-full border border-brand-500/20 w-fit mx-auto animate-bounce">
              <Brain className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">Flashcard Deck Uninitialized</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Generate a set of 15 high-quality conceptual flashcards custom-tailored to your uploaded study material.
              </p>
            </div>
            <button
              onClick={handleGenerateDeck}
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-2xl shadow-lg shadow-brand-500/15 transition-all active:scale-98"
            >
              <Sparkles className="w-4 h-4" />
              Generate Study Flashcards
            </button>
          </div>
        )}

        {/* GENERATING SCREEN */}
        {!loading && status === 'generating' && !error && (
          <div className="max-w-md w-full mx-auto bg-slate-900/60 border border-slate-850 p-8 rounded-3xl text-center space-y-6 shadow-xl">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-brand-500/10 border-t-brand-500 rounded-full animate-spin"></div>
              <Flame className="w-6 h-6 text-brand-400 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">AI Generation In Progress</h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Gemini is parsing your lecture concepts and formulating spaced-repetition question-and-answer templates.
              </p>
              <p className="text-xs text-brand-450 animate-pulse font-medium">Please wait, auto-redirecting when ready...</p>
            </div>
          </div>
        )}

        {/* READY / INTERACTIVE STUDY SCREEN */}
        {!loading && status === 'ready' && !error && (
          <div className="space-y-8">
            
            {/* Session Completed Summary Screen */}
            {sessionCompleted ? (
              <div className="max-w-lg w-full mx-auto bg-slate-900/80 border border-slate-800 p-8 rounded-3xl text-center space-y-8 shadow-2xl">
                <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full border border-emerald-500/15 w-fit mx-auto">
                  <Award className="w-10 h-10" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-white tracking-tight">Study Session Complete!</h2>
                  <p className="text-sm text-slate-450 leading-relaxed">
                    Nice work! You reviewed <strong className="text-white">{sessionReviewedCount}</strong> cards in this session. The intervals have been updated in your profile.
                  </p>
                </div>

                {/* Box progress distribution */}
                <div className="bg-slate-950/60 border border-slate-850 p-5 rounded-2xl text-left space-y-4">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">Leitner Distribution:</span>
                  <div className="grid grid-cols-5 gap-2">
                    {boxCounts.map((count, idx) => (
                      <div key={idx} className="bg-slate-900/80 border border-slate-850 p-2.5 rounded-xl text-center">
                        <span className="text-[10px] text-slate-500 block font-medium">Box {idx + 1}</span>
                        <span className="text-sm font-extrabold text-white">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => {
                      setReviewMode('due');
                      setSessionCompleted(false);
                      setCurrentIndex(0);
                    }}
                    className="flex-1 py-3 px-4 bg-brand-600 hover:bg-brand-500 text-white font-bold text-sm rounded-xl shadow-lg active:scale-98 transition-all"
                  >
                    Review Due Cards
                  </button>
                  <button
                    onClick={() => {
                      setReviewMode('all');
                      setSessionCompleted(false);
                      setCurrentIndex(0);
                    }}
                    className="flex-1 py-3 px-4 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-bold text-sm rounded-xl active:scale-98 transition-all"
                  >
                    Review All Cards
                  </button>
                </div>

                <div className="border-t border-slate-850 pt-4 flex justify-between items-center text-xs text-slate-550">
                  <span>Completed at {new Date().toLocaleTimeString()}</span>
                  <button 
                    onClick={handleResetProgress}
                    className="text-red-400 hover:underline font-bold"
                  >
                    Reset Deck Progress
                  </button>
                </div>
              </div>
            ) : (
              // Active Review Carousel
              <div className="space-y-6">
                
                {/* Mode Selector and Counts */}
                <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 border-b border-slate-900 pb-5">
                  <div className="flex flex-col space-y-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Review Mode:</span>
                    <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 w-fit">
                      <button
                        onClick={() => setReviewMode('due')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          reviewMode === 'due'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-550 hover:text-slate-350'
                        }`}
                      >
                        Due Cards ({cards.filter(c => !c.nextReviewDate || new Date(c.nextReviewDate) <= new Date()).length})
                      </button>
                      <button
                        onClick={() => setReviewMode('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                          reviewMode === 'all'
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-550 hover:text-slate-350'
                        }`}
                      >
                        All Cards ({cards.length})
                      </button>
                    </div>
                  </div>

                  {/* Quick stats panel */}
                  <div className="flex gap-4">
                    <div className="bg-slate-900/40 border border-slate-900 px-4 py-2 rounded-2xl flex items-center gap-3">
                      <Flame className="w-5 h-5 text-brand-400" />
                      <div>
                        <span className="text-sm font-bold text-white block">
                          {cards.filter(c => c.box === 5).length}/{cards.length}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">Mastered (Box 5)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Study Flow */}
                {sessionCards.length === 0 ? (
                  // Caught Up screen
                  <div className="max-w-md w-full mx-auto bg-slate-900/60 border border-slate-850 p-10 rounded-3xl text-center space-y-6 shadow-xl">
                    <div className="bg-emerald-500/10 text-emerald-400 p-4 rounded-full border border-emerald-500/15 w-fit mx-auto">
                      <Inbox className="w-8 h-8" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-xl font-bold text-white tracking-tight">You're All Caught Up!</h2>
                      <p className="text-sm text-slate-400 leading-relaxed">
                        There are no cards pending review in Box 1-4 for this document. Excellent job staying consistent!
                      </p>
                    </div>
                    <button
                      onClick={() => setReviewMode('all')}
                      className="w-full inline-flex items-center justify-center gap-2 py-3 bg-brand-650 hover:bg-brand-600 text-white text-sm font-bold rounded-2xl transition-all shadow-md active:scale-98"
                    >
                      <Play className="w-4 h-4" />
                      Review All Cards Instead
                    </button>
                    <div className="pt-2">
                      <button 
                        onClick={handleResetProgress}
                        className="text-xs text-red-400/80 hover:text-red-400 hover:underline font-semibold"
                      >
                        Reset Deck Progress
                      </button>
                    </div>
                  </div>
                ) : (
                  // Interactive flashcard deck container
                  <div className="space-y-6">
                    {/* Progress Indicator */}
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 max-w-xl mx-auto px-2">
                      <span>Card {currentIndex + 1} of {sessionCards.length}</span>
                      <div className="w-1/3 bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-850">
                        <div 
                          className="bg-brand-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${((currentIndex + 1) / sessionCards.length) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-brand-400">
                        {Math.round(((currentIndex + 1) / sessionCards.length) * 100)}% complete
                      </span>
                    </div>

                    {/* Active card */}
                    <FlashcardContainer
                      key={sessionCards[currentIndex].id} // Force re-render with new key when index changes
                      card={sessionCards[currentIndex]}
                      onRateCard={handleRateCard}
                    />

                    {/* Footer resets */}
                    <div className="text-center pt-6 border-t border-slate-900 max-w-xl mx-auto">
                      <button 
                        onClick={handleResetProgress}
                        className="text-[11px] text-slate-600 hover:text-red-400 font-bold transition-colors"
                      >
                        Reset All Review Histories
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-650">
        <p>© 2026 Recall AI. Optimized with Leitner Spaced-Repetition schedules.</p>
      </footer>
    </div>
  );
};

export default FlashcardsPage;
