import React, { useState, useRef } from 'react';
import { Play, Pause, Volume2, Sparkles, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { synthesizeAll, generateAudio } from '../services/gemini';
import { Diagram } from './Diagram';
import { ArxivPaper } from '../services/arxiv';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AnalysisAgentProps {
  papers: ArxivPaper[];
  mainDiagram: string;
  preloadedResult?: {
    analysis: string;
    subDiagrams: string[];
    audioData?: string;
  } | null;
}

export const AnalysisAgent: React.FC<AnalysisAgentProps> = ({ papers, mainDiagram, preloadedResult }) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<{
    analysis: string;
    subDiagrams: string[];
    audioData?: string;
  } | null>(preloadedResult || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (preloadedResult) {
      setResult(preloadedResult);
      if (preloadedResult.audioData) {
        const blob = base64ToBlob(preloadedResult.audioData, 'audio/mpeg');
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
          // We don't auto-play immediately to respect browser policies, 
          // but we prepare it. If the user switches to this tab, they might expect it.
          // Actually, let's try to play it if the user is already on this tab.
        }
      }
    }
  }, [preloadedResult]);

  const handleStartAnalysis = async () => {
    setAnalyzing(true);
    setResult(null);
    setError(null);
    try {
      const data = await synthesizeAll(papers);
      setResult(data);
      setAnalyzing(false);
      
      // Decoupled audio generation
      generateAudio(data.analysis).then(audioData => {
        if (audioData) {
          setResult(prev => prev ? { ...prev, audioData } : null);
        }
      }).catch(err => {
        console.error('Audio generation failed:', err);
      });
    } catch (error) {
      console.error('Analysis failed:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('Full error details:', error);
      setError(
        errorMsg.includes('GEMINI_API_KEY')
          ? 'API key not configured. Check Cloud Run environment variables.'
          : errorMsg.includes('429')
          ? 'API rate limit exceeded. Please try again in a moment.'
          : errorMsg.includes('Failed to parse')
          ? 'Invalid API response format. The model may need updating.'
          : `Failed to process research: ${errorMsg}`
      );
      setAnalyzing(false);
    }
  };

  const base64ToBlob = (base64: string, type: string) => {
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      arr[i] = binStr.charCodeAt(i);
    }
    return new Blob([arr], { type });
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">Multimodal Analysis & Narration</p>
        </div>
        
        {!result && !analyzing && (
          <button
            onClick={handleStartAnalysis}
            className="px-6 py-3 bg-[#141414] text-[#E4E3E0] rounded-full text-xs font-medium flex items-center gap-3 hover:opacity-90 transition-all shadow-xl shadow-black/20"
          >
            <Sparkles size={16} />
            Initialize Deep Analysis
          </button>
        )}
      </div>

      {analyzing && (
        <div className="py-20 flex flex-col items-center justify-center border border-dashed border-[#141414]/20 rounded-3xl bg-white/30">
          <Loader2 className="animate-spin text-[#141414] mb-4" size={32} />
          <p className="font-serif italic text-lg opacity-60">Synthesizing cross-paper insights...</p>
          <p className="text-[10px] uppercase tracking-widest opacity-30 mt-2">Generating audio narration & sub-diagrams</p>
        </div>
      )}

      {error && (
        <div className="py-12 px-6 flex flex-col items-center justify-center border border-red-300 rounded-3xl bg-red-50/50">
          <p className="text-sm font-semibold text-red-700 mb-2">Analysis Failed</p>
          <p className="text-xs text-red-600 text-center max-w-md mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null);
              handleStartAnalysis();
            }}
            className="px-4 py-2 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Audio & Text Analysis */}
            <div className="bg-white rounded-3xl p-8 border border-[#141414]/5 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#141414]" />
              
              <div className="flex items-start gap-6">
                <button
                  onClick={togglePlay}
                  disabled={!result.audioData}
                  className={cn(
                    "w-14 h-14 bg-[#141414] text-[#E4E3E0] rounded-2xl flex items-center justify-center flex-shrink-0 transition-all",
                    !result.audioData ? "opacity-50 cursor-not-allowed" : "hover:scale-105"
                  )}
                >
                  {!result.audioData ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : isPlaying ? (
                    <Pause size={24} />
                  ) : (
                    <Play size={24} className="ml-1" />
                  )}
                </button>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <Volume2 size={14} className="opacity-40" />
                    <span className="text-[10px] uppercase tracking-widest opacity-40 font-mono">
                      {result.audioData ? 'Audio Narration Active' : 'Synthesizing Audio...'}
                    </span>
                  </div>
                  <p className="font-serif italic text-xl leading-relaxed text-[#141414]/80">
                    "{result.analysis}"
                  </p>
                </div>
              </div>
              
              <audio 
                ref={audioRef} 
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
            </div>

            {/* Sub-Diagrams */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] uppercase tracking-widest opacity-40 font-mono">Granular Visualizations</h4>
                <button 
                  onClick={() => setExpanded(!expanded)}
                  className="p-2 hover:bg-[#141414]/5 rounded-lg transition-colors"
                >
                  {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              </div>

              <AnimatePresence>
                {expanded && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden"
                  >
                    {result.subDiagrams.map((chart, idx) => (
                      <div key={idx} className="space-y-3">
                        <div className="flex items-center gap-2 opacity-30">
                          <div className="w-1 h-1 bg-[#141414] rounded-full" />
                          <span className="text-[9px] uppercase tracking-tighter font-mono">Detail View 0{idx + 1}</span>
                        </div>
                        <Diagram chart={chart} />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
