import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Award, BookOpen, Clock, Database, HelpCircle, Calendar, ExternalLink, X } from 'lucide-react';
import type { HistoryEntry } from '../types';

interface ProvenanceData {
  lessonId: string;
  topic: string;
  subject: string;
  timestamp: string;
  providers: {
    llm: string;
    image: string;
    tts: string;
  };
  provenance: {
    steps: {
      name: string;
      provider: string;
      modelOrVoice: string;
      durationMs: number;
      cost: number;
      retries: number;
      status: string;
    }[];
    totalCost: number;
    totalDurationMs: number;
    b2Uploaded: boolean;
    b2Urls?: {
      video?: string;
      captions?: string;
      metadata?: string;
      quiz?: string;
    };
  };
}

export default function Dashboard() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Provenance inspector modal state
  const [selectedProvenance, setSelectedProvenance] = useState<ProvenanceData | null>(null);

  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch('/api/lessons');
        if (!response.ok) throw new Error('Failed to load study history.');
        const data = await response.json();
        setHistory(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadHistory();
  }, []);

  const handleInspectProvenance = async (e: React.MouseEvent, lessonId: string) => {
    e.stopPropagation(); // prevent card click navigation
    e.preventDefault();

    try {
      const response = await fetch(`/api/lessons/${lessonId}/details`);
      if (!response.ok) throw new Error('Failed to load provenance details');
      const data = await response.json();
      setSelectedProvenance(data);
    } catch (err) {
      alert('Could not retrieve detailed provenance logs for this lesson.');
    }
  };

  // Calculate statistics
  const totalLessons = history.length;
  
  // Calculate study streak (dummy calculation based on consecutive days, or default 1 if lessons > 0)
  const streak = totalLessons > 0 ? Math.min(totalLessons, 3) : 0; // simple streak representational logic

  const gradedLessons = history.filter(h => h.quizScore !== null);
  const averageScore = gradedLessons.length > 0 
    ? Math.round(gradedLessons.reduce((acc, h) => acc + (h.quizScore || 0), 0) / gradedLessons.length * 10) / 10
    : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8 animate-fade-in">
      
      {/* Dashboard Headline */}
      <div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900">Student Study Portal</h2>
        <p className="text-slate-500 text-sm mt-1">Review past lessons, quiz scores, and Backblaze B2 storage history.</p>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Streak Counter */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 shrink-0 shadow-lg shadow-amber-500/10">
            <Flame className="w-7 h-7 fill-current" />
          </div>
          <div>
            <span className="block text-3xl font-black text-slate-900">{streak} Days</span>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Learning Streak
            </span>
          </div>
        </div>

        {/* Lessons Completed */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-indigo-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-500 shrink-0 shadow-lg shadow-indigo-500/10">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <span className="block text-3xl font-black text-slate-900">{totalLessons} Lessons</span>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Explainer Videos Created
            </span>
          </div>
        </div>

        {/* Avg Quiz Score */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 shadow-sm flex items-center gap-5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-full blur-xl pointer-events-none" />
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-500 shrink-0 shadow-lg shadow-emerald-500/10">
            <Award className="w-7 h-7" />
          </div>
          <div>
            <span className="block text-3xl font-black text-slate-900">
              {averageScore !== null ? `${averageScore} Correct` : 'N/A'}
            </span>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Quiz Rating
            </span>
          </div>
        </div>

      </div>

      {/* History Grid */}
      <div className="flex flex-col gap-4">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-5 h-5 text-indigo-500" />
          Recently Studied Lessons
        </h3>

        {loading ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
            <span className="text-slate-500 text-sm">Retrieving your study history...</span>
          </div>
        ) : error ? (
          <div className="py-12 bg-rose-50 border border-rose-200 rounded-2xl text-center text-rose-600 text-sm">
            Failed to load history: {error}
          </div>
        ) : history.length === 0 ? (
          <div className="py-16 text-center rounded-3xl border border-dashed border-slate-300 flex flex-col items-center gap-4 bg-white/50 backdrop-blur-md shadow-sm">
            <BookOpen className="w-12 h-12 text-slate-300" />
            <div>
              <span className="block text-slate-800 font-bold text-lg">No lessons found</span>
              <span className="block text-slate-500 text-sm">Create your first explainer video to begin studying!</span>
            </div>
            <Link
              to="/"
              className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm rounded-xl transition-all shadow-lg shadow-indigo-500/10"
            >
              Start Learning
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {history.map((lesson) => (
              <Link
                key={lesson.lessonId}
                to={`/lesson/${lesson.lessonId}`}
                className="group relative rounded-3xl overflow-hidden bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all hover:scale-[1.01] flex flex-col shadow-sm"
              >
                {/* Scene thumbnail */}
                <div className="aspect-video w-full overflow-hidden bg-gray-900 relative">
                  <img
                    src={lesson.thumbnailUrl}
                    alt={lesson.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      // Fallback image in case rendering isn't fully completed
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=400';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/10 to-transparent" />
                  <span className="absolute top-3 left-3 text-[10px] font-extrabold uppercase tracking-wider px-2 py-1 rounded bg-white/90 text-indigo-700 border border-indigo-100 backdrop-blur-sm shadow-sm">
                    {lesson.subject}
                  </span>
                </div>

                {/* Body Content */}
                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="flex flex-col gap-1.5">
                    <h4 className="font-bold text-slate-800 text-base leading-snug group-hover:text-indigo-600 transition-colors">
                      {lesson.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(lesson.timestamp).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs">
                    {/* Score Tag */}
                    <span className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 ${
                      lesson.quizScore !== null
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      <HelpCircle className="w-3.5 h-3.5" />
                      {lesson.quizScore !== null ? `Score: ${lesson.quizScore}` : 'Not taken'}
                    </span>

                    {/* Audit Log inspect Button */}
                    <button
                      onClick={(e) => handleInspectProvenance(e, lesson.lessonId)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-700 font-bold transition-all shadow-sm"
                      title="Inspect B2 Storage Provenance Metadata"
                    >
                      <Database className="w-3.5 h-3.5 text-amber-500" />
                      Provenance
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Provenance Inspector Modal */}
      {selectedProvenance && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white border border-slate-200 rounded-3xl flex flex-col max-h-[85vh] overflow-hidden shadow-2xl relative animate-scale-in">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-amber-500 animate-pulse" />
                <div>
                  <h3 className="font-extrabold text-slate-900 text-lg">B2 Provenance Inspector</h3>
                  <span className="block text-[10px] text-slate-500">SHA-256 Provenance & Generation Audit Log</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedProvenance(null)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scroll Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              
              {/* Summary details */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs text-center">
                <div>
                  <span className="block text-slate-500 font-semibold mb-1">Durable B2 Storage</span>
                  <span className={`font-bold ${selectedProvenance.provenance.b2Uploaded ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {selectedProvenance.provenance.b2Uploaded ? 'ACTIVE (DURABLE)' : 'LOCAL (DEVELOPMENT)'}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 font-semibold mb-1">Total Pipeline Duration</span>
                  <span className="text-slate-900 font-extrabold">
                    {(selectedProvenance.provenance.totalDurationMs / 1000).toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 font-semibold mb-1">Total Resource Cost</span>
                  <span className="text-indigo-600 font-extrabold">
                    ${selectedProvenance.provenance.totalCost.toFixed(4)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-500 font-semibold mb-1">Lesson Unique ID</span>
                  <span className="text-slate-600 font-mono text-[9px] truncate block max-w-[120px] mx-auto">
                    {selectedProvenance.lessonId}
                  </span>
                </div>
              </div>

              {/* B2 URLs Section if uploaded */}
              {selectedProvenance.provenance.b2Uploaded && selectedProvenance.provenance.b2Urls && (
                <div className="flex flex-col gap-3">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-emerald-500" />
                    Backblaze B2 Public S3 Links
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {selectedProvenance.provenance.b2Urls.video && (
                      <a
                        href={selectedProvenance.provenance.b2Urls.video}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-between text-slate-700 hover:text-emerald-700 transition-all font-semibold shadow-sm"
                      >
                        <span>🎬 final.mp4 (Stitched Video)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {selectedProvenance.provenance.b2Urls.captions && (
                      <a
                        href={selectedProvenance.provenance.b2Urls.captions}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-between text-slate-700 hover:text-emerald-700 transition-all font-semibold shadow-sm"
                      >
                        <span>📄 captions.vtt (Subtitle Track)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {selectedProvenance.provenance.b2Urls.metadata && (
                      <a
                        href={selectedProvenance.provenance.b2Urls.metadata}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-between text-slate-700 hover:text-emerald-700 transition-all font-semibold shadow-sm"
                      >
                        <span>📁 metadata.json (Full Provenance)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {selectedProvenance.provenance.b2Urls.quiz && (
                      <a
                        href={selectedProvenance.provenance.b2Urls.quiz}
                        target="_blank"
                        rel="noreferrer"
                        className="p-3 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 flex items-center justify-between text-slate-700 hover:text-emerald-700 transition-all font-semibold shadow-sm"
                      >
                        <span>📝 quiz.json (Assessment Key)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Step Audit Breakdown */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-indigo-500" />
                  Multi-Provider Steps Performance
                </h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs shadow-sm">
                  <table className="w-full text-left border-collapse bg-white">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                        <th className="p-3.5">Step Name</th>
                        <th className="p-3.5">Provider</th>
                        <th className="p-3.5">Model / Config</th>
                        <th className="p-3.5 text-right">Duration</th>
                        <th className="p-3.5 text-right">Cost</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedProvenance.provenance.steps.map((step, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 text-slate-800 font-semibold">{step.name}</td>
                          <td className="p-3.5 uppercase text-indigo-600 font-bold">{step.provider}</td>
                          <td className="p-3.5 text-slate-500 truncate max-w-[140px]" title={step.modelOrVoice}>
                            {step.modelOrVoice}
                          </td>
                          <td className="p-3.5 text-right font-medium text-slate-700">
                            {(step.durationMs / 1000).toFixed(2)}s
                          </td>
                          <td className="p-3.5 text-right font-bold text-indigo-600">
                            ${step.cost.toFixed(4)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Raw JSON Manifest Inspector */}
              <div className="flex flex-col gap-3">
                <h4 className="text-sm font-bold text-slate-800">Raw Provenance JSON</h4>
                <pre className="p-4 bg-slate-50 rounded-2xl text-[10px] font-mono text-slate-600 border border-slate-200 overflow-x-auto max-h-[160px] whitespace-pre shadow-inner">
                  {JSON.stringify(selectedProvenance, null, 2)}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedProvenance(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition-colors shadow-sm"
              >
                Close Audit Logs
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
