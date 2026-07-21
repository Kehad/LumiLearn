import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Play, AlertCircle, Clock, HelpCircle, FileText, BarChart3, Database } from 'lucide-react';
import VideoPlayer from '../components/VideoPlayer';
import Quiz from '../components/Quiz';
import type { LessonMetadata, PipelineStatus, QuizQuestion } from '../types';

const TRIVIA_FACTS = [
  { subject: 'Biology 🧬', fact: 'Plants look green because chlorophyll absorbs blue and red light, but reflects green light back to our eyes!' },
  { subject: 'Physics ⚡', fact: 'Light travels from the Sun to the Earth in about 8 minutes and 20 seconds. It travels at 300,000 kilometers per second!' },
  { subject: 'Chemistry 🧪', fact: 'Water is the only natural substance on Earth that can exist in three physical states: solid (ice), liquid (water), and gas (steam)!' },
  { subject: 'Mathematics 📐', fact: 'The word "Mathematics" comes from the Greek word "mathema", which means "knowledge, study, or learning".' },
  { subject: 'Biology 🧬', fact: 'A single tree can produce enough oxygen for up to four people to breathe cleanly every single day.' },
  { subject: 'Physics ⚡', fact: 'Sound travels about four times faster in water than it does in air because water molecules are packed tighter!' },
  { subject: 'Chemistry 🧪', fact: 'Helium is lighter than air, which is why helium-filled balloons float upwards into the sky.' },
  { subject: 'General Science 🌍', fact: 'The Earth is about 4.5 billion years old. Humans have only been around for a tiny fraction of that time!' }
];

export default function Lesson() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<PipelineStatus | null>(null);
  const [details, setDetails] = useState<LessonMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [triviaIdx, setTriviaIdx] = useState(0);
  const [showScript, setShowScript] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Rotating trivia timer
  useEffect(() => {
    let interval: any;
    if (loading && !details) {
      interval = setInterval(() => {
        setTriviaIdx(prev => (prev + 1) % TRIVIA_FACTS.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [loading, details]);

  // Polling hook for generation status
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    let pollInterval: any;

    const fetchStatus = async () => {
      try {
        const response = await fetch(`/api/lessons/${id}/status`);
        if (!response.ok) {
          throw new Error('Lesson not found');
        }
        const data: PipelineStatus = await response.json();
        
        if (!isMounted) return;
        setStatus(data);

        if (data.status === 'completed') {
          // If completed, fetch full details and stop polling
          clearInterval(pollInterval);
          await fetchDetails();
        } else if (data.status === 'failed') {
          clearInterval(pollInterval);
          setError(data.error || 'Pipeline execution failed.');
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
          clearInterval(pollInterval);
        }
      }
    };

    const fetchDetails = async () => {
      try {
        const response = await fetch(`/api/lessons/${id}/details`);
        if (!response.ok) throw new Error('Failed to fetch details');
        const data: LessonMetadata = await response.json();
        
        if (isMounted) {
          setDetails(data);
          setLoading(false);
          // If the lesson already had a quiz score, load it and reveal the quiz
          if (data.quizScore !== undefined && data.quizScore !== null) {
            setQuizScore(data.quizScore);
            setShowQuiz(true);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    };

    // Initial check
    fetchStatus();

    // Set polling interval
    pollInterval = setInterval(fetchStatus, 1500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [id]);

  const handleVideoEnded = () => {
    // Reveal the quiz component
    setShowQuiz(true);
    // Smooth scroll down to the quiz
    setTimeout(() => {
      const quizEl = document.getElementById('quiz-section');
      if (quizEl) {
        quizEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  };

  const handleQuizCompleted = (score: number) => {
    setQuizScore(score);
  };

  // 1. Loading/Generation State (Interactive Tracker + Trivia)
  if (loading && !details) {
    const progress = status?.progress || 0;
    const stepName = status?.stepName || 'Initializing video generator...';
    const activeStep = status?.step || 0;

    return (
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 flex flex-col gap-8 items-center animate-fade-in">
        
        {/* Progress Header */}
        <div className="text-center w-full max-w-md">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto mb-4 animate-spin-slow shadow-sm">
            <Clock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900">Creating Your Lesson Video</h2>
          <p className="text-slate-500 text-sm mt-1">This takes about 10–30 seconds. Learn a trivia fact while you wait!</p>
        </div>

        {/* Dynamic Trivia Card */}
        <div className="w-full max-w-xl p-6 rounded-3xl bg-white border border-slate-200 shadow-xl text-center relative overflow-hidden flex flex-col gap-3 min-h-[165px] justify-center items-center">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          
          <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 px-3 py-1 rounded-full bg-indigo-50">
            Did you know? ({TRIVIA_FACTS[triviaIdx].subject})
          </span>
          <p className="text-base text-slate-800 leading-relaxed font-semibold transition-all duration-500 px-4">
            "{TRIVIA_FACTS[triviaIdx].fact}"
          </p>
        </div>

        {/* Pipeline Progress tracker */}
        <div className="w-full max-w-xl bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-5">
          <div>
            <div className="flex justify-between items-center text-sm font-semibold mb-2">
              <span className="text-slate-800 font-bold">Pipeline Steps Tracker</span>
              <span className="text-indigo-600">{progress}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-[1px]">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="block text-xs text-indigo-600 italic mt-2 text-center font-medium">
              Current: {stepName}
            </span>
          </div>

          {/* List of steps */}
          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            {[
              { num: 1, name: 'Simplify Text & Core Storyboard' },
              { num: 3, name: 'Illustrate Scenes (SDXL/Flux/DALL-E)' },
              { num: 4, name: 'Slow voice narration (ElevenLabs/Hume)' },
              { num: 5, name: 'Sync Captions & Subtitles' },
              { num: 6, name: 'Stitch MP4 Video (ffmpeg)' },
              { num: 7, name: 'Write Comprehension Quiz' },
              { num: 8, name: 'Durable Upload (Backblaze B2)' }
            ].map((stepItem, idx) => {
              const isCompleted = activeStep > stepItem.num || (activeStep === 8 && progress === 100);
              const isActive = activeStep === stepItem.num;
              
              return (
                <div key={idx} className="flex items-center justify-between text-xs md:text-sm">
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isCompleted 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                        : isActive 
                          ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 animate-pulse'
                          : 'bg-slate-50 text-slate-400 border border-slate-200'
                    }`}>
                      {isCompleted ? '✓' : stepItem.num === 1 ? '1' : stepItem.num - 1}
                    </div>
                    <span className={`font-medium ${
                      isCompleted ? 'text-slate-400 line-through' : isActive ? 'text-slate-900 font-bold' : 'text-slate-500'
                    }`}>
                      {stepItem.name}
                    </span>
                  </div>
                  {isActive && (
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-600 animate-pulse">
                      In progress
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center flex flex-col items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Generation Failed</h2>
          <p className="text-gray-400 text-sm mt-1">{error}</p>
        </div>
        <Link 
          to="/"
          className="px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm transition-colors"
        >
          Return to Home
        </Link>
      </div>
    );
  }

  // 3. Completed Lesson Screen
  if (!details) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8 animate-fade-in">
      
      {/* Title & Header info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
              {details.subject.toUpperCase()}
            </span>
            <span className="text-xs text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Generated {new Date(details.timestamp).toLocaleDateString()}
            </span>
          </div>
          <h2 className="text-2xl md:text-4xl font-extrabold text-slate-900 leading-tight">
            {details.title || details.topic}
          </h2>
        </div>
        <div className="flex gap-3">
          <Link
            to="/dashboard"
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm rounded-xl text-sm font-semibold transition-all hover:scale-102 flex items-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4" />
            My Dashboard
          </Link>
        </div>
      </div>

      {/* Video Segment */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center text-sm font-bold text-slate-500 px-1">
          <span className="flex items-center gap-1 text-indigo-600">
            <Play className="w-4 h-4 fill-current" /> Accessible Video Explainer
          </span>
          <span className="text-xs font-normal">Narrated slowly & illustrated per scene</span>
        </div>
        <VideoPlayer 
          src={details.provenance.b2Uploaded && details.provenance.b2Urls?.video ? details.provenance.b2Urls.video : `/lessons/${id}/final.mp4`}
          vttSrc={details.provenance.b2Uploaded && details.provenance.b2Urls?.captions ? details.provenance.b2Urls.captions : `/lessons/${id}/captions.vtt`}
          onEnded={handleVideoEnded}
        />
      </div>

      {/* Mid-Lesson Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Simplified Script Accordion */}
        <div className="md:col-span-2 bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
          <button
            onClick={() => setShowScript(!showScript)}
            className="w-full flex items-center justify-between text-left text-base font-bold text-slate-900"
          >
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Read Simplified Explanation Script
            </span>
            <span className="text-xs font-semibold text-indigo-700 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-xl">
              {showScript ? 'Hide' : 'Expand'}
            </span>
          </button>

          {showScript && (
            <div className="flex flex-col gap-5 border-t border-slate-100 pt-4 mt-2 animate-fade-in">
              {details.scenes.map((scene) => (
                <div key={scene.sceneNumber} className="flex gap-4 items-start bg-slate-50 p-4 rounded-2xl border border-slate-100 shadow-sm">
                  <span className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {scene.sceneNumber}
                  </span>
                  <div>
                    <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Scene Description
                    </span>
                    <p className="text-sm text-slate-800 leading-relaxed font-semibold">
                      {scene.narration}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Provenance Audit logs */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4.5 h-4.5 text-amber-500" />
            Genblaze Provenance Log
          </h4>
          <div className="flex flex-col gap-3 text-xs">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">B2 Storage</span>
              <span className={`font-bold ${details.provenance.b2Uploaded ? 'text-emerald-600' : 'text-amber-600'}`}>
                {details.provenance.b2Uploaded ? '✓ Uploaded (Durable)' : 'Local Mirror (Dev)'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Simplify LLM</span>
              <span className="text-slate-800 font-semibold">{details.providers.llm}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">TTS Provider</span>
              <span className="text-slate-800 font-semibold">{details.providers.tts}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500 font-medium">Image Gen</span>
              <span className="text-slate-800 font-semibold">{details.providers.image}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Pipeline Duration</span>
              <span className="text-slate-800 font-semibold">
                {(details.provenance.totalDurationMs / 1000).toFixed(1)}s
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Quiz Section */}
      {showQuiz && (
        <div id="quiz-section" className="border-t border-slate-200 pt-8 flex flex-col gap-6 animate-slide-up bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="text-center max-w-md mx-auto">
            <h3 className="text-2xl font-extrabold text-slate-900 flex items-center justify-center gap-2">
              <HelpCircle className="w-6 h-6 text-indigo-600" />
              Check Your Understanding
            </h3>
            <p className="text-slate-500 text-sm mt-1">Take the interactive quiz below to lock in the information!</p>
          </div>

          {/* Render the interactive quiz */}
          <Quiz 
            lessonId={id!} 
            questions={details.quiz as QuizQuestion[]}
            onQuizCompleted={handleQuizCompleted}
          />
        </div>
      )}

    </div>
  );
}
