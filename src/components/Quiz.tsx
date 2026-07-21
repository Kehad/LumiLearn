import React, { useState } from 'react';
import { Award, CheckCircle, XCircle, ChevronRight, HelpCircle, RefreshCw, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // A, B, C, or D
  explanation: string;
}

interface QuizProps {
  lessonId: string;
  questions: QuizQuestion[];
  onQuizCompleted?: (score: number) => void;
}

export default function Quiz({ lessonId, questions, onQuizCompleted }: QuizProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [savingScore, setSavingScore] = useState(false);

  const currentQuestion = questions[currentIdx];

  const handleOptionSelect = (idx: number) => {
    if (hasSubmitted) return; // prevent changing option after checking
    setSelectedOption(idx);
  };

  const getOptionLetter = (idx: number): string => {
    return ['A', 'B', 'C', 'D'][idx];
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || hasSubmitted) return;

    setHasSubmitted(true);
    const selectedLetter = getOptionLetter(selectedOption);
    
    if (selectedLetter === currentQuestion.correctAnswer) {
      setScore(prev => prev + 1);
    }
  };

  const handleNext = () => {
    setSelectedOption(null);
    setHasSubmitted(false);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      handleCompleteQuiz();
    }
  };

  const handleCompleteQuiz = async () => {
    setIsCompleted(true);
    const finalScore = score;
    
    // Celebrate if they got a perfect score!
    if (finalScore === questions.length) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#fbbf24', '#10b981']
      });
    }

    // Save score to backend Express API
    setSavingScore(true);
    try {
      const response = await fetch(`/api/lessons/${lessonId}/quiz-score`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: finalScore })
      });
      if (response.ok) {
        console.log('Quiz score saved successfully!');
      }
    } catch (e) {
      console.error('Failed to save quiz score:', e);
    } finally {
      setSavingScore(false);
    }

    if (onQuizCompleted) {
      onQuizCompleted(finalScore);
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setHasSubmitted(false);
    setScore(0);
    setIsCompleted(false);
  };

  // Render Result Screen
  if (isCompleted) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="w-full max-w-2xl mx-auto p-8 rounded-3xl bg-white text-center border border-slate-200 shadow-xl flex flex-col items-center gap-6 animate-scale-in">
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 via-indigo-500 to-purple-600 p-0.5 shadow-xl shadow-indigo-500/10">
          <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
            <Award className="w-10 h-10 text-amber-500 animate-bounce" />
          </div>
        </div>

        <div>
          <h3 className="text-3xl font-extrabold text-slate-900">Quiz Finished!</h3>
          <p className="text-slate-500 text-sm mt-1">Excellent effort studying today</p>
        </div>

        <div className="flex flex-col gap-1 items-center bg-slate-50 border border-slate-100 px-8 py-5 rounded-2xl min-w-[200px]">
          <span className="text-5xl font-black text-indigo-600">
            {score} / {questions.length}
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Correct Answers ({percentage}%)
          </span>
        </div>

        <div className="text-sm max-w-sm leading-relaxed text-slate-700">
          {percentage === 100 
            ? "Amazing! You fully understood this lesson. Keep this perfect streak going!" 
            : percentage >= 50 
              ? "Good job! You understood the main ideas. Replay the video anytime to review." 
              : "Keep practicing! Educational concepts take time to learn. You can retake this quiz anytime."
          }
        </div>

        <div className="flex gap-4 w-full justify-center">
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm text-sm font-semibold transition-all hover:scale-[1.02]"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Option style generator
  const getOptionClasses = (idx: number) => {
    const isSelected = selectedOption === idx;
    const optionLetter = getOptionLetter(idx);
    
    if (hasSubmitted) {
      const isCorrect = optionLetter === currentQuestion.correctAnswer;
      if (isCorrect) {
        return 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm';
      }
      if (isSelected && !isCorrect) {
        return 'border-rose-200 bg-rose-50 text-rose-700 shadow-sm';
      }
      return 'border-slate-200 bg-slate-50 text-slate-400 opacity-60';
    }

    if (isSelected) {
      return 'border-indigo-300 bg-indigo-50 text-indigo-700 shadow-sm scale-[1.01]';
    }

    return 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:border-slate-300 shadow-sm transition-all';
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 md:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl flex flex-col gap-6 animate-fade-in">
      
      {/* Quiz Progress Bar */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <span className="flex items-center gap-1.5 text-indigo-600">
          <HelpCircle className="w-4 h-4" />
          Lesson Comprehension Check
        </span>
        <span>
          Question {currentIdx + 1} of {questions.length}
        </span>
      </div>

      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question Text */}
      <h3 className="text-xl md:text-2xl font-bold leading-snug text-slate-900">
        {currentQuestion.question}
      </h3>

      {/* Options List */}
      <div className="flex flex-col gap-3">
        {currentQuestion.options.map((option, idx) => {
          const letter = getOptionLetter(idx);
          const isSelected = selectedOption === idx;
          const isCorrect = letter === currentQuestion.correctAnswer;
          
          return (
            <button
              key={idx}
              disabled={hasSubmitted}
              onClick={() => handleOptionSelect(idx)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border text-left text-sm md:text-base font-medium ${getOptionClasses(idx)}`}
            >
              <div className="flex items-center gap-4">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm ${
                  isSelected 
                    ? 'bg-indigo-600 text-white' 
                    : hasSubmitted && isCorrect 
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-500'
                }`}>
                  {letter}
                </span>
                <span>{option}</span>
              </div>
              
              {hasSubmitted && (
                <div>
                  {isCorrect && <CheckCircle className="w-5 h-5 text-emerald-500 fill-emerald-100" />}
                  {isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-500 fill-rose-100" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Feedback Explanation Card */}
      {hasSubmitted && (
        <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100 text-sm leading-relaxed text-indigo-800 animate-slide-up shadow-sm">
          <span className="block font-bold text-indigo-700 mb-1 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" /> Explanation:
          </span>
          {currentQuestion.explanation}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex justify-end border-t border-slate-200 pt-4 mt-2">
        {!hasSubmitted ? (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedOption === null}
            className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all ${
              selectedOption === null
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95'
            }`}
          >
            Check Answer
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center gap-1.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-indigo-500/20"
          >
            {currentIdx + 1 === questions.length ? 'Finish Quiz' : 'Next Question'}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
