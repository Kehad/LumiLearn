import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Settings2, ArrowRight, AlertCircle } from 'lucide-react';

const SUBJECT_TAGS = [
  { id: 'biology', name: 'Biology 🧬', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10' },
  { id: 'chemistry', name: 'Chemistry 🧪', color: 'border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10' },
  { id: 'physics', name: 'Physics ⚡', color: 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10' },
  { id: 'mathematics', name: 'Math 📐', color: 'border-sky-500/30 text-sky-400 bg-sky-500/5 hover:bg-sky-500/10' },
  { id: 'general', name: 'General Science 🌍', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10' },
];

const PRESETS = [
  { label: 'Photosynthesis', subject: 'biology', text: 'Photosynthesis is the process by which green plants and certain other organisms transform light energy into chemical energy. During photosynthesis in green plants, light energy is captured and used to convert water, carbon dioxide, and minerals into oxygen and energy-rich organic compounds.' },
  { label: 'The Water Cycle', subject: 'general', text: 'The water cycle shows the continuous movement of water within the Earth and atmosphere. It is a complex system that includes many different processes. Liquid water evaporates into water vapor, condenses to form clouds, and precipitates back to earth in the form of rain and snow.' },
  { label: 'Newton\'s First Law', subject: 'physics', text: 'Newton\'s First Law of Motion states that an object at rest remains at rest, and an object in motion remains in motion at a constant velocity unless acted upon by a net external force. This is also known as the law of inertia, describing how objects resist changes to their state of motion.' }
];

export default function Landing() {
  const navigate = useNavigate();
  const [topicText, setTopicText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('biology');
  const [isMockMode, setIsMockMode] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Pipeline settings
  const [llmProvider, setLlmProvider] = useState('gemini');
  const [imageProvider, setImageProvider] = useState('mock');
  const [ttsProvider, setTtsProvider] = useState('mock');
  const [ttsVoice, setTtsVoice] = useState('Rachel');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setTopicText(preset.text);
    setSelectedSubject(preset.subject);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const text = topicText.trim();
    if (text.length < 5) {
      setError('Please paste a textbook passage or topic that is at least 5 characters long.');
      return;
    }
    if (text.length > 3000) {
      setError('To maintain high generation quality, topics are limited to 3,000 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: text,
          subject: selectedSubject,
          options: {
            llmProvider,
            imageProvider: isMockMode ? 'mock' : imageProvider,
            ttsProvider: isMockMode ? 'mock' : ttsProvider,
            ttsVoice,
            isMockMode,
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to start lesson generation. Please try again.');
      }

      const data = await response.json();
      if (data.lessonId) {
        // Navigate to the lesson details page which handles the loading state
        navigate(`/lesson/${data.lessonId}`);
      } else {
        throw new Error('Server returned invalid session details.');
      }
    } catch (e: any) {
      setError(e.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 md:py-16 flex flex-col items-center gap-8 animate-fade-in">
      
      {/* Hero Headline */}
      <div className="text-center max-w-2xl flex flex-col gap-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-semibold uppercase tracking-widest mx-auto animate-pulse-slow">
          <Sparkles className="w-3.5 h-3.5" />
          Nigerian Syllabus Aligned
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-slate-900 leading-tight">
          Understand Any Textbook <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 bg-clip-text text-transparent">Instantly</span>
        </h1>
        <p className="text-slate-600 text-base md:text-lg leading-relaxed max-w-lg mx-auto">
          Paste dense, difficult paragraphs from your school notes or textbook. We build a slow narrated video and an interactive quiz to help you learn!
        </p>
      </div>

      {/* Main Generator Card */}
      <form onSubmit={handleGenerate} className="w-full bg-white/80 backdrop-blur-2xl rounded-3xl p-6 md:p-8 border border-slate-200 flex flex-col gap-6 shadow-xl relative">
        
        {/* Input Area */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-bold text-slate-700 flex items-center justify-between">
            <span>Paste your topic or textbook passage here</span>
            <span className="text-xs font-normal text-slate-500">{topicText.length}/3000 chars</span>
          </label>
          <textarea
            value={topicText}
            onChange={(e) => setTopicText(e.target.value)}
            placeholder="Example: Photosynthesis, cell division, or write: 'Explain Newton's laws of motion with simple examples'..."
            className="w-full min-h-[160px] md:min-h-[200px] bg-white border border-slate-200 rounded-2xl p-4 text-sm md:text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-y shadow-sm"
            disabled={isSubmitting}
            required
          />
        </div>

        {/* Example Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">Try an example:</span>
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-semibold transition-all hover:scale-[1.02] shadow-sm"
              disabled={isSubmitting}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Subject Taxonomy Selector */}
        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
          <span className="text-sm font-bold text-slate-700">Select Subject Category</span>
          <div className="flex flex-wrap gap-2.5">
            {SUBJECT_TAGS.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setSelectedSubject(tag.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs md:text-sm font-semibold border transition-all hover:scale-[1.02] ${
                  selectedSubject === tag.id
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-md shadow-indigo-500/10 scale-102'
                    : tag.color
                }`}
                disabled={isSubmitting}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Mock Mode Switch Banner */}
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start gap-3 text-xs leading-relaxed text-indigo-800">
          <AlertCircle className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
          <div>
            <span className="block font-bold text-indigo-900 mb-0.5">Offline-Friendly Mock Mode is Active by Default</span>
            To make evaluation instant, LumiLearn runs in a local sandbox mode using Google Translate TTS and curated high-quality stock illustrations. It requires zero API keys to generate full MP4 videos and quizzes! Uncheck "Mock Mode" in the settings below if you have added API keys in your <code className="bg-indigo-100 px-1 rounded font-mono text-indigo-900 border border-indigo-200">.env</code>.
          </div>
        </div>

        {/* Advanced Settings Toggle */}
        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase tracking-wider"
          >
            <Settings2 className="w-4 h-4" />
            {showAdvanced ? 'Hide API Settings' : 'Advanced API & Provider settings'}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200 shadow-inner animate-slide-down">
              
              {/* Sandbox Toggle */}
              <div className="flex items-center justify-between col-span-1 md:col-span-2 border-b border-slate-200 pb-3">
                <div>
                  <span className="block text-sm font-bold text-slate-800">Enable Sandbox Mock Mode</span>
                  <span className="block text-[11px] text-slate-500">Run local generation pipeline (no keys needed)</span>
                </div>
                <input
                  type="checkbox"
                  checked={isMockMode}
                  onChange={(e) => setIsMockMode(e.target.checked)}
                  className="w-10 h-5 accent-indigo-500 cursor-pointer rounded-lg"
                  disabled={isSubmitting}
                />
              </div>

              {/* LLM Select */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Simplification LLM</span>
                <select
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 shadow-sm rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={isMockMode || isSubmitting}
                >
                  <option value="gemini">Gemini (gemini-1.5-flash)</option>
                  <option value="openai">OpenAI (gpt-4o-mini)</option>
                </select>
              </div>

              {/* Image Gen Select */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Illustration Generator</span>
                <select
                  value={imageProvider}
                  onChange={(e) => setImageProvider(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 shadow-sm rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={isMockMode || isSubmitting}
                >
                  <option value="openai">OpenAI (DALL-E 3)</option>
                  <option value="replicate">Replicate (Stability AI SDXL)</option>
                  <option value="gmi">GMI Cloud (Flux Schnell)</option>
                </select>
              </div>

              {/* TTS Voice Select */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">Narration Voice Provider</span>
                <select
                  value={ttsProvider}
                  onChange={(e) => setTtsProvider(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 shadow-sm rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={isMockMode || isSubmitting}
                >
                  <option value="elevenlabs">ElevenLabs (Acoustic AI)</option>
                  <option value="lmnt">LMNT (Slow Speech Synthesis)</option>
                  <option value="hume">Hume AI (Expressive TTS)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-600">ElevenLabs Voice Model</span>
                <select
                  value={ttsVoice}
                  onChange={(e) => setTtsVoice(e.target.value)}
                  className="w-full bg-white text-slate-800 border border-slate-200 shadow-sm rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={isMockMode || isSubmitting}
                >
                  <option value="Rachel">Rachel (Clear, Female)</option>
                  <option value="Adam">Adam (Deep, Male)</option>
                  <option value="Bella">Bella (Friendly, Female)</option>
                </select>
              </div>

            </div>
          )}
        </div>

        {/* Display Errors */}
        {error && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold text-base md:text-lg transition-all hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Initializing Pipeline...
            </div>
          ) : (
            <>
              Generate Lesson Video & Quiz
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
