import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Settings, Type } from 'lucide-react';

interface Cue {
  start: number;
  end: number;
  text: string;
}

interface VideoPlayerProps {
  src: string;
  vttSrc: string;
  onEnded?: () => void;
}

export default function VideoPlayer({ src, vttSrc, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(0.85); // Default to slow pace for accessibility
  const [captionSize, setCaptionSize] = useState<'sm' | 'md' | 'lg'>('lg'); // Default to large captions
  const [captionTheme, setCaptionTheme] = useState<'yellow' | 'white' | 'high-contrast'>('high-contrast');
  const [cues, setCues] = useState<Cue[]>([]);
  const [activeCue, setActiveCue] = useState<string>('');
  const [isMuted, setIsMuted] = useState(false);
  const [showSpeedControls, setShowSpeedControls] = useState(false);

  // Fetch and parse the WebVTT caption file
  useEffect(() => {
    async function loadCaptions() {
      try {
        const response = await fetch(vttSrc);
        if (!response.ok) throw new Error('Failed to load subtitles');
        const text = await response.text();
        
        // Simple WebVTT parser
        const parsedCues: Cue[] = [];
        const blocks = text.split('\n\n');
        
        for (const block of blocks) {
          const lines = block.trim().split('\n');
          if (lines.length >= 2) {
            const timeLine = lines[0].includes('-->') ? lines[0] : lines[1];
            const textLine = lines[0].includes('-->') ? lines.slice(1).join(' ') : lines.slice(2).join(' ');
            
            if (timeLine && timeLine.includes('-->')) {
              const [startStr, endStr] = timeLine.split('-->');
              const start = parseVttTime(startStr.trim());
              const end = parseVttTime(endStr.trim());
              
              parsedCues.push({ start, end, text: textLine });
            }
          }
        }
        setCues(parsedCues);
      } catch (err) {
        console.error('Error parsing VTT captions:', err);
      }
    }

    if (vttSrc) {
      loadCaptions();
    }
  }, [vttSrc]);

  // Adjust video playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, isPlaying]);

  // Helper to parse VTT Timestamp (HH:MM:SS.mmm or MM:SS.mmm)
  function parseVttTime(timeStr: string): number {
    const parts = timeStr.split(':');
    let hrs = 0, mins = 0, secs = 0;
    
    if (parts.length === 3) {
      hrs = parseInt(parts[0], 10);
      mins = parseInt(parts[1], 10);
      const secParts = parts[2].split('.');
      secs = parseInt(secParts[0], 10) + (parseInt(secParts[1], 10) || 0) / 1000;
    } else {
      mins = parseInt(parts[0], 10);
      const secParts = parts[1].split('.');
      secs = parseInt(secParts[0], 10) + (parseInt(secParts[1], 10) || 0) / 1000;
    }
    
    return hrs * 3600 + mins * 60 + secs;
  }

  // Handle video playback updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      
      // Update active subtitle cue
      const cue = cues.find(c => time >= c.start && time <= c.end);
      setActiveCue(cue ? cue.text : '');
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleRestart = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      const val = parseFloat(e.target.value);
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleFullscreen = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Format progress timing (MM:SS)
  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Caption Styling classes based on user preferences
  const getCaptionStyles = () => {
    let sizeClass = 'text-lg md:text-xl';
    if (captionSize === 'md') sizeClass = 'text-xl md:text-2xl';
    if (captionSize === 'lg') sizeClass = 'text-2xl md:text-3xl lg:text-4xl';

    let themeClass = 'text-white bg-black/60';
    if (captionTheme === 'yellow') themeClass = 'text-amber-300 bg-black/80 font-bold';
    if (captionTheme === 'high-contrast') themeClass = 'text-[#0df5ff] bg-black border border-[#0df5ff]/30 shadow-[0_0_15px_rgba(13,245,255,0.2)] font-extrabold';

    return `${sizeClass} ${themeClass}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-xl relative group/player">
      
      {/* Video Viewport */}
      <div className="relative aspect-video flex items-center justify-center cursor-pointer select-none" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={src}
          className="w-full h-full object-contain"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => {
            setIsPlaying(false);
            if (onEnded) onEnded();
          }}
        />

        {/* Custom Caption Overlay */}
        {activeCue && (
          <div className="absolute bottom-16 left-4 right-4 text-center pointer-events-none flex justify-center z-10 animate-fade-in">
            <div className={`px-5 py-2.5 rounded-2xl max-w-[85%] leading-relaxed text-center shadow-lg ${getCaptionStyles()}`}>
              {activeCue}
            </div>
          </div>
        )}

        {/* Playback Overlay Banner */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-indigo-500/80 flex items-center justify-center text-white scale-100 hover:scale-110 active:scale-95 transition-all shadow-lg shadow-indigo-500/30">
              <Play className="w-10 h-10 fill-current translate-x-1" />
            </div>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-3">
        
        {/* Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 focus:outline-none"
          />
          <span className="text-xs text-slate-500 font-medium">{formatTime(duration)}</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* Restart */}
            <button
              onClick={handleRestart}
              className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              title="Restart Video"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            {/* Mute */}
            <button
              onClick={toggleMute}
              className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-rose-500" /> : <Volume2 className="w-5 h-5" />}
            </button>

            {/* Speed Adjuster */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedControls(!showSpeedControls)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  showSpeedControls
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'text-slate-600 hover:text-slate-900 border-slate-200 bg-white hover:bg-slate-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                {playbackSpeed.toFixed(2)}x
              </button>

              {showSpeedControls && (
                <div className="absolute bottom-10 left-0 bg-white border border-slate-200 p-1.5 rounded-xl shadow-xl flex flex-col gap-1 z-30 min-w-[100px]">
                  {[0.75, 0.85, 1.0, 1.25].map((speed) => (
                    <button
                      key={speed}
                      onClick={() => {
                        setPlaybackSpeed(speed);
                        setShowSpeedControls(false);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-left text-xs font-medium transition-colors ${
                        playbackSpeed === speed
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {speed === 0.85 || speed === 0.75 ? `${speed.toFixed(2)}x (Slower)` : `${speed.toFixed(2)}x`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subtitle & Fullscreen Options */}
          <div className="flex items-center gap-4">
            
            {/* Caption Size Toggle */}
            <div className="flex items-center gap-1 bg-white border border-slate-200 shadow-sm p-1 rounded-xl">
              <button
                onClick={() => setCaptionSize('sm')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                  captionSize === 'sm' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Small Captions"
              >
                A
              </button>
              <button
                onClick={() => setCaptionSize('md')}
                className={`p-1.5 rounded-lg text-sm font-bold transition-all ${
                  captionSize === 'md' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Medium Captions"
              >
                A
              </button>
              <button
                onClick={() => setCaptionSize('lg')}
                className={`p-1.5 rounded-lg text-base font-bold transition-all ${
                  captionSize === 'lg' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-700'
                }`}
                title="Large Captions"
              >
                A
              </button>
            </div>

            {/* Subtitle Theme Select */}
            <button
              onClick={() => {
                const themes: ('yellow' | 'white' | 'high-contrast')[] = ['white', 'yellow', 'high-contrast'];
                const nextIdx = (themes.indexOf(captionTheme) + 1) % themes.length;
                setCaptionTheme(themes[nextIdx]);
              }}
              className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              title="Change Caption Styling"
            >
              <Type className="w-5 h-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={handleFullscreen}
              className="p-2.5 rounded-xl hover:bg-slate-200 text-slate-500 hover:text-slate-900 transition-colors"
              title="Fullscreen"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
