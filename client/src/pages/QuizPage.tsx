import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/api';
import { 
  ArrowLeft, Loader2, Sparkles, Check, X, RefreshCw, 
  HelpCircle, Trophy, ChevronRight, AlertCircle, BookOpen
} from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

interface Document {
  id: number;
  _id: number;
  title: string;
  subject: string;
}

export const QuizPage: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();

  const [document, setDocument] = useState<Document | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [status, setStatus] = useState<'loading' | 'not_generated' | 'generating' | 'ready'>('loading');
  const [loadingMsg, setLoadingMsg] = useState('Syncing document settings...');
  
  // Quiz Game State
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOptionIdx, setSelectedOptionIdx] = useState<number | null>(null);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [userAnswers, setUserAnswers] = useState<number[]>([]); // record chosen index for each question

  const fetchDocumentAndQuizStatus = async () => {
    try {
      // 1. Fetch document metadata
      const docsRes = await api.get('/documents');
      const foundDoc = (docsRes.data.documents || []).find(
        (d: Document) => d.id.toString() === docId || d._id.toString() === docId
      );
      
      if (!foundDoc) {
        alert('Document not found or unauthorized');
        navigate('/');
        return;
      }
      setDocument(foundDoc);

      // 2. Fetch quiz status
      const quizRes = await api.get(`/quizzes/${docId}`);
      if (quizRes.data.status === 'ready') {
        setQuestions(quizRes.data.questions || []);
        setStatus('ready');
      } else if (quizRes.data.status === 'generating') {
        setStatus('generating');
        setLoadingMsg('AI is compiling your quiz context...');
      } else {
        setStatus('not_generated');
      }
    } catch (err) {
      console.error('Failed to load quiz settings:', err);
    }
  };

  useEffect(() => {
    if (docId) {
      fetchDocumentAndQuizStatus();
    }
  }, [docId]);

  // Polling for quiz generation completion
  useEffect(() => {
    if (status !== 'generating') return;

    const interval = setInterval(async () => {
      try {
        const quizRes = await api.get(`/quizzes/${docId}`);
        if (quizRes.data.status === 'ready') {
          setQuestions(quizRes.data.questions || []);
          setStatus('ready');
          clearInterval(interval);
        } else if (quizRes.data.status === 'generating') {
          // Progress simulation text
          const msgs = [
            'Analyzing notes chunks...',
            'Synthesizing multiple choice patterns...',
            'Adding explanation keys...',
            'Finalizing scoring structure...'
          ];
          setLoadingMsg(msgs[Math.floor(Math.random() * msgs.length)]);
        } else {
          setStatus('not_generated');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling failed:', err);
        clearInterval(interval);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [status, docId]);

  const handleStartGeneration = async () => {
    try {
      setStatus('generating');
      setLoadingMsg('Requesting quiz generation job...');
      await api.post(`/quizzes/generate/${docId}`);
    } catch (err: any) {
      console.error('Failed to generate quiz:', err);
      alert(err.response?.data?.error || 'Generation failed. Please try again.');
      setStatus('not_generated');
    }
  };

  const handleOptionSelect = (optionIdx: number) => {
    if (isAnswerRevealed) return;
    setSelectedOptionIdx(optionIdx);
  };

  const handleRevealAnswer = () => {
    if (selectedOptionIdx === null || isAnswerRevealed) return;

    const currentQuestion = questions[currentIdx];
    const isCorrect = selectedOptionIdx === currentQuestion.correctAnswerIndex;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
    }

    setUserAnswers(prev => [...prev, selectedOptionIdx]);
    setIsAnswerRevealed(true);
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(prev => prev + 1);
      setSelectedOptionIdx(null);
      setIsAnswerRevealed(false);
    } else {
      setQuizFinished(true);
      // Log quiz activity to award XP in progress dashboard
      api.post('/dashboard/activity', {
        activityType: 'quiz_completed',
        documentId: parseInt(docId || '', 10),
        score,
        totalQuestions: questions.length
      }).catch(err => console.error('Failed to log quiz activity:', err));
    }
  };

  const handleRetake = () => {
    setCurrentIdx(0);
    setSelectedOptionIdx(null);
    setIsAnswerRevealed(false);
    setScore(0);
    setQuizFinished(false);
    setUserAnswers([]);
  };

  // Feedback strings
  const getFeedbackMessage = () => {
    const pct = (score / questions.length) * 100;
    if (pct === 100) return { title: 'Perfect Genius! 🏆', msg: 'You have completely mastered this material! Excellent job!' };
    if (pct >= 80) return { title: 'Superb Work! 🌟', msg: 'You have a fantastic grasp of the main concepts!' };
    if (pct >= 50) return { title: 'Good Attempt! 📚', msg: 'Decent understanding, but a bit more review will nail it.' };
    return { title: 'Keep Practicing! 💪', msg: 'Review the study guide and retake the quiz to improve.' };
  };

  const feedback = getFeedbackMessage();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative selection:bg-brand-500 selection:text-white">
      {/* Background glow highlights */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-[140px] pointer-events-none -translate-y-1/2"></div>
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-550/5 rounded-full blur-[140px] pointer-events-none translate-y-1/2"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/70 border-b border-slate-800/80 px-6 py-4 flex justify-between items-center">
        <button
          onClick={() => navigate(document ? `/subject/${encodeURIComponent(document.subject)}` : '/')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-all py-1.5 px-3 rounded-lg hover:bg-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Materials</span>
        </button>

        <div className="flex-1 text-center px-4 min-w-0">
          <h1 className="text-sm font-bold text-white tracking-tight truncate max-w-xs md:max-w-md mx-auto">
            {document?.title || 'AI MCQ Quiz'}
          </h1>
          {document && (
            <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
              {document.subject}
            </p>
          )}
        </div>

        <div className="w-[85px] flex justify-end">
          {status === 'ready' && !quizFinished && (
            <button
              onClick={handleRetake}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl transition-all"
              title="Reset Quiz"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 md:p-6 flex flex-col justify-center">
        
        {/* 1. Loading Settings */}
        {status === 'loading' && (
          <div className="text-center py-20 space-y-4">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
            <p className="text-sm text-slate-400">{loadingMsg}</p>
          </div>
        )}

        {/* 2. Start Generation Call-to-action */}
        {status === 'not_generated' && (
          <div className="border border-slate-850/80 bg-slate-900/40 backdrop-blur-sm p-8 md:p-12 rounded-3xl text-center space-y-6 shadow-xl">
            <div className="bg-brand-500/10 text-brand-400 p-4 rounded-full border border-brand-500/15 w-fit mx-auto animate-pulse">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white tracking-tight">AI MCQ Quiz Generator</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Generate an interactive quiz containing 10 multiple-choice questions synthesized directly from the text pages of your uploaded notes.
              </p>
            </div>
            <button
              onClick={handleStartGeneration}
              className="bg-brand-650 hover:bg-brand-600 border border-brand-550/15 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Generate Quiz
            </button>
          </div>
        )}

        {/* 3. Generating Loader Stepper */}
        {status === 'generating' && (
          <div className="border border-slate-850 bg-slate-900/20 backdrop-blur-sm p-8 md:p-12 rounded-3xl text-center space-y-6 shadow-xl max-w-md mx-auto w-full">
            <Loader2 className="w-10 h-10 text-brand-500 animate-spin mx-auto" />
            <div className="space-y-1">
              <h4 className="font-bold text-white text-sm">Generating Quiz...</h4>
              <p className="text-xs text-slate-500 leading-normal">{loadingMsg}</p>
            </div>

            {/* Simulated steppers to wow the user */}
            <div className="text-left border-t border-slate-850 pt-5 space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <Check className="w-4 h-4 text-emerald-400 bg-emerald-500/10 p-0.5 rounded-full" />
                <span className="text-slate-300 font-medium">Extracting document note sections</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                <span className="text-slate-200 font-medium">Formulating question options via Gemini</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-600">
                <HelpCircle className="w-4 h-4" />
                <span>Validating answers & explanation details</span>
              </div>
            </div>
          </div>
        )}

        {/* 4. Active Quiz Taking Page */}
        {status === 'ready' && !quizFinished && questions.length > 0 && (
          <div className="space-y-6">
            
            {/* Progress Panel */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-500 font-semibold tracking-wider uppercase">
                <span>Progress: Question {currentIdx + 1} of {questions.length}</span>
                <span className="text-brand-400">Score: {score}</span>
              </div>
              <div className="h-2 bg-slate-900 border border-slate-850/50 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-brand-500 transition-all duration-300"
                  style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Question Card */}
            <div className="bg-slate-900/50 border border-slate-850/80 p-6 md:p-8 rounded-3xl shadow-md space-y-4">
              <span className="text-[10px] bg-brand-500/10 text-brand-400 border border-brand-500/15 font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full select-none">
                MCQ Question
              </span>
              <h3 className="font-bold text-white text-base md:text-lg leading-relaxed select-text">
                {questions[currentIdx].question}
              </h3>
            </div>

            {/* Options List */}
            <div className="grid gap-3">
              {questions[currentIdx].options.map((option, optIdx) => {
                const currentQuestion = questions[currentIdx];
                const isSelected = selectedOptionIdx === optIdx;
                const isCorrectAnswer = optIdx === currentQuestion.correctAnswerIndex;
                
                // Color formatting logic after reveal
                let buttonStyle = 'bg-slate-900/40 hover:bg-slate-900 border-slate-850 text-slate-200';
                let iconEl = null;

                if (isAnswerRevealed) {
                  if (isCorrectAnswer) {
                    buttonStyle = 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 shadow-sm shadow-emerald-500/5';
                    iconEl = <Check className="w-4 h-4 text-emerald-400 shrink-0" />;
                  } else if (isSelected) {
                    buttonStyle = 'bg-red-500/10 border-red-500/40 text-red-300 shadow-sm shadow-red-500/5';
                    iconEl = <X className="w-4 h-4 text-red-400 shrink-0" />;
                  } else {
                    buttonStyle = 'bg-slate-950/20 border-slate-900 text-slate-500 opacity-60';
                  }
                } else if (isSelected) {
                  buttonStyle = 'bg-brand-500/10 border-brand-500/50 text-brand-300';
                }

                return (
                  <button
                    key={optIdx}
                    disabled={isAnswerRevealed}
                    onClick={() => handleOptionSelect(optIdx)}
                    className={`flex items-center gap-4 w-full border text-left px-5 py-4 rounded-2xl text-xs md:text-sm font-semibold transition-all duration-200 ${
                      isAnswerRevealed 
                        ? 'hover:translate-y-0 opacity-80' 
                        : 'hover:-translate-y-0.5 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5 active:translate-y-0'
                    } ${buttonStyle}`}
                  >
                    {/* Option letter badge (A, B, C, D) */}
                    <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border transition-all shrink-0 ${
                      isAnswerRevealed
                        ? isCorrectAnswer
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : isSelected
                            ? 'bg-red-500/20 border-red-500/40 text-red-400'
                            : 'bg-slate-950/40 border-slate-900 text-slate-650'
                        : isSelected
                          ? 'bg-brand-500/20 border-brand-500/50 text-brand-300'
                          : 'bg-slate-950/50 border-slate-800 text-slate-400'
                    }`}>
                      {String.fromCharCode(65 + optIdx)}
                    </span>
                    
                    <span className="select-text flex-1 py-0.5 leading-relaxed">{option}</span>
                    
                    {iconEl && (
                      <span className="shrink-0 ml-2">
                        {iconEl}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box */}
            {isAnswerRevealed && (
              <div className="bg-slate-900 border border-slate-850 p-5 rounded-2xl text-xs md:text-sm text-slate-350 leading-relaxed space-y-2 shadow-inner border-l-2 border-l-brand-500">
                <div className="flex items-center gap-2 text-brand-400 font-bold uppercase tracking-wider text-[10px]">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Explanation Detail:
                </div>
                <p className="select-text italic">
                  {questions[currentIdx].explanation}
                </p>
              </div>
            )}

            {/* Action Bar */}
            <div className="flex justify-end pt-2">
              {!isAnswerRevealed ? (
                <button
                  disabled={selectedOptionIdx === null}
                  onClick={handleRevealAnswer}
                  className="bg-brand-650 hover:bg-brand-600 disabled:opacity-40 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95 disabled:scale-100 disabled:cursor-not-allowed"
                >
                  Confirm Answer
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95"
                >
                  {currentIdx + 1 < questions.length ? 'Next Question' : 'View Results'}
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

          </div>
        )}

        {/* 5. Score Board Dashboard Panel */}
        {quizFinished && (
          <div className="space-y-6">
            
            {/* Scorecard banner */}
            <div className="border border-slate-850 bg-slate-900/40 backdrop-blur-sm p-8 md:p-10 rounded-3xl text-center space-y-6 shadow-xl">
              <div className="bg-amber-500/10 text-amber-400 p-4 rounded-full border border-amber-500/15 w-fit mx-auto">
                <Trophy className="w-10 h-10 animate-bounce" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-xl font-black text-white tracking-tight">{feedback.title}</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto">{feedback.msg}</p>
              </div>

              {/* Score Display */}
              <div className="inline-flex flex-col items-center justify-center bg-slate-950 border border-slate-850 px-8 py-5 rounded-2xl shadow-inner">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Final Score</span>
                <span className="text-3xl font-black text-brand-400 mt-1">{score} <span className="text-slate-650 text-base font-normal">/ {questions.length}</span></span>
                <span className="text-[10px] text-emerald-400 font-semibold mt-1">
                  {Math.round((score / questions.length) * 100)}% accuracy rate
                </span>
              </div>

              {/* Reset CTA */}
              <div className="pt-2">
                <button
                  onClick={handleRetake}
                  className="bg-brand-650 hover:bg-brand-600 border border-brand-550/15 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md active:scale-95 transition-all inline-flex items-center gap-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  Retake Quiz
                </button>
              </div>
            </div>

            {/* Questions Review list */}
            <div className="space-y-4">
              <h4 className="font-bold text-white text-sm border-b border-slate-900 pb-2.5 flex items-center gap-2 select-none">
                <BookOpen className="w-4 h-4 text-slate-400" />
                Review Your Answers:
              </h4>
              
              <div className="grid gap-4">
                {questions.map((q, idx) => {
                  const userAnsIdx = userAnswers[idx];
                  const isCorrect = userAnsIdx === q.correctAnswerIndex;
                  return (
                    <div 
                      key={idx}
                      className="bg-slate-900/40 border border-slate-850 p-5 rounded-2xl space-y-3.5 shadow-sm text-xs md:text-sm select-text"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-bold text-white leading-relaxed">
                          {idx + 1}. {q.question}
                        </span>
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full select-none shrink-0">
                            <Check className="w-3 h-3" />
                            correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full select-none shrink-0">
                            <X className="w-3 h-3" />
                            incorrect
                          </span>
                        )}
                      </div>

                      {/* Display what user chose vs correct option */}
                      <div className="space-y-1 bg-slate-950/40 p-3 rounded-xl border border-slate-850/50">
                        <p className="text-slate-400 text-xs">
                          Your answer: <span className={isCorrect ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                            {q.options[userAnsIdx]}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className="text-slate-400 text-xs">
                            Correct answer: <span className="text-emerald-400 font-semibold">{q.options[q.correctAnswerIndex]}</span>
                          </p>
                        )}
                      </div>

                      {/* Explanation */}
                      <p className="text-slate-400 text-xs italic leading-normal border-l border-brand-500/20 pl-2">
                        {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 px-6 py-6 text-center text-xs text-slate-650 z-20">
        <p>© 2026 Recall AI.</p>
      </footer>
    </div>
  );
};

export default QuizPage;
