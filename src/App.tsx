import React, { useState, useEffect } from 'react';
import { Search, Loader2, Network, FileText, ExternalLink, Sparkles, ChevronRight, Share2, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { searchArxiv, ArxivPaper } from './services/arxiv';
import { synthesizeAll, generateAudio } from './services/gemini';
import { Diagram } from './components/Diagram';
import { AnalysisAgent } from './components/AnalysisAgent';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [query, setQuery] = useState('');
  const [papers, setPapers] = useState<ArxivPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPapers, setSelectedPapers] = useState<ArxivPaper[]>([]);
  const [diagram, setDiagram] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<{
    analysis: string;
    subDiagrams: string[];
    audioData?: string;
  } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<'diagram' | 'analysis'>('diagram');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError(null);
    setOffset(0);
    setHasMore(true);
    try {
      const results = await searchArxiv(query, 20, 0);
      setPapers(results);
      if (results.length < 20) setHasMore(false);
    } catch (err) {
      setError('Failed to fetch research papers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    const nextOffset = offset + 20;
    try {
      const results = await searchArxiv(query, 20, nextOffset);
      if (results.length === 0) {
        setHasMore(false);
      } else {
        setPapers(prev => [...prev, ...results]);
        setOffset(nextOffset);
        if (results.length < 20) setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more papers:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleGenerateSingle = async (paper: ArxivPaper) => {
    setGenerating(true);
    setDiagram(null);
    setAnalysisResult(null);
    setError(null);
    setActiveTab('diagram');
    try {
      const result = await synthesizeAll([paper]);
      setDiagram(result.diagram);
      setAnalysisResult(result);
      setGenerating(false);

      // Background audio generation
      generateAudio(result.analysis).then(audioData => {
        if (audioData) {
          setAnalysisResult(prev => prev ? { ...prev, audioData } : null);
        }
      });
    } catch (err) {
      setError('Failed to generate diagram. Gemini might be busy.');
      setGenerating(false);
    }
  };

  const handleSynthesize = async () => {
    if (selectedPapers.length === 0) return;
    
    setGenerating(true);
    setDiagram(null);
    setAnalysisResult(null);
    setError(null);
    setActiveTab('diagram');
    
    try {
      const result = await synthesizeAll(selectedPapers);
      setDiagram(result.diagram);
      setAnalysisResult(result);
      setGenerating(false);

      // Background audio generation
      generateAudio(result.analysis).then(audioData => {
        if (audioData) {
          setAnalysisResult(prev => prev ? { ...prev, audioData } : null);
        }
      });
    } catch (err) {
      console.error('Synthesis error:', err);
      setError('Failed to process research. The AI model might be overloaded or the content is too complex.');
      setGenerating(false);
    }
  };

  const togglePaperSelection = (paper: ArxivPaper) => {
    setSelectedPapers(prev => 
      prev.find(p => p.id === paper.id) 
        ? prev.filter(p => p.id !== paper.id)
        : [...prev, paper]
    );
  };

  const clearSelection = () => {
    setSelectedPapers([]);
    setDiagram(null);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex justify-between items-center bg-[#E4E3E0] sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#141414] rounded-lg flex items-center justify-center">
            <Network className="text-[#E4E3E0] w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif italic text-xl leading-none">ArXiv Synthesis Engine</h1>
            <p className="text-[10px] uppercase tracking-widest opacity-50 mt-1">Multimodal Research Processor v1.0</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {selectedPapers.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="px-3 py-2 border border-[#141414]/10 rounded-full text-[10px] uppercase tracking-widest hover:bg-[#141414]/5 transition-all"
              >
                Clear
              </button>
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={handleSynthesize}
                disabled={generating}
                className="px-4 py-2 bg-[#141414] text-[#E4E3E0] rounded-full text-xs font-medium flex items-center gap-2 hover:opacity-90 disabled:opacity-30 transition-all shadow-lg shadow-black/10"
              >
                <Sparkles size={14} className={cn(generating && "animate-pulse")} />
                {selectedPapers.length === 1 ? 'Visualize Paper' : `Synthesize ${selectedPapers.length} Papers`}
              </motion.button>
            </div>
          )}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-[400px_1fr] min-h-[calc(100vh-89px)]">
        {/* Sidebar: Search & Results */}
        <aside className="border-r border-[#141414] p-6 bg-[#E4E3E0]/50 backdrop-blur-sm overflow-y-auto max-h-[calc(100vh-89px)]">
          <form onSubmit={handleSearch} className="relative mb-8">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search research topics..."
              className="w-full bg-transparent border-b border-[#141414] py-3 pl-1 pr-10 focus:outline-none placeholder:opacity-30 text-sm font-mono"
            />
            <button type="submit" className="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:opacity-50 transition-opacity">
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
            </button>
          </form>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="font-serif italic text-xs opacity-50 uppercase tracking-widest">Research Feed</span>
              {papers.length > 0 && <span className="text-[10px] font-mono opacity-50">{papers.length} results</span>}
            </div>

            <AnimatePresence mode="popLayout">
              {papers.map((paper, idx) => (
                <motion.div
                  key={paper.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "group p-4 border border-[#141414]/10 rounded-xl cursor-pointer transition-all hover:border-[#141414] hover:bg-white/50",
                    selectedPapers.find(p => p.id === paper.id) && "border-[#141414] bg-white shadow-sm"
                  )}
                  onClick={() => togglePaperSelection(paper)}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-medium text-sm leading-tight group-hover:underline decoration-1 underline-offset-4">
                      {paper.title}
                    </h3>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleGenerateSingle(paper);
                      }}
                      className="p-1.5 rounded-lg hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                      title="Generate Diagram"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                  <p className="text-[11px] opacity-60 line-clamp-3 mb-3 font-mono leading-relaxed">
                    {paper.summary}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 opacity-40 text-[9px] font-mono uppercase tracking-tighter">
                      <FileText size={10} />
                      {paper.authors[0]} et al.
                    </div>
                    <a 
                      href={paper.link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="opacity-40 hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {papers.length > 0 && hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 border border-dashed border-[#141414]/20 rounded-xl text-[10px] uppercase tracking-widest hover:bg-[#141414]/5 transition-all disabled:opacity-50"
              >
                {loadingMore ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={12} />
                    Loading...
                  </div>
                ) : (
                  'Load More Results'
                )}
              </button>
            )}

            {!loading && papers.length === 0 && (
              <div className="py-20 text-center opacity-30">
                <p className="font-serif italic text-sm">No research loaded.</p>
                <p className="text-[10px] uppercase tracking-widest mt-2">Enter a query to begin synthesis</p>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content: Diagram Visualizer */}
        <section className="p-8 lg:p-12 overflow-y-auto bg-[#F0EFED] relative">
          <div className="max-w-4xl mx-auto h-full flex flex-col">
            {/* Lab Notebook Tabs */}
            <div className="flex gap-1 mb-0 translate-y-[1px] z-10">
              <button
                onClick={() => setActiveTab('diagram')}
                className={cn(
                  "px-6 py-3 rounded-t-2xl text-[10px] uppercase tracking-widest font-medium transition-all border-x border-t",
                  activeTab === 'diagram' 
                    ? "bg-white border-[#141414]/20 text-[#141414]" 
                    : "bg-[#E4E3E0]/50 border-transparent text-[#141414]/40 hover:bg-[#E4E3E0]"
                )}
              >
                01. Technical Synthesis
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={cn(
                  "px-6 py-3 rounded-t-2xl text-[10px] uppercase tracking-widest font-medium transition-all border-x border-t",
                  activeTab === 'analysis' 
                    ? "bg-white border-[#141414]/20 text-[#141414]" 
                    : "bg-[#E4E3E0]/50 border-transparent text-[#141414]/40 hover:bg-[#E4E3E0]"
                )}
              >
                02. Research Agent
              </button>
            </div>

            <div className="bg-white border border-[#141414]/20 rounded-b-3xl rounded-tr-3xl p-8 lg:p-12 shadow-sm flex-1 flex flex-col min-h-[600px]">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest opacity-40 block mb-2">
                    {activeTab === 'diagram' ? 'Visualization Module' : 'Analysis Module'}
                  </span>
                  <h2 className="font-serif italic text-3xl">
                    {activeTab === 'diagram' ? 'Technical Synthesis' : 'Research Synthesis Agent'}
                  </h2>
                </div>
                
                {diagram && activeTab === 'diagram' && (
                  <div className="flex gap-2">
                    <button className="p-2 border border-[#141414]/10 rounded-lg hover:bg-[#141414] hover:text-[#E4E3E0] transition-all">
                      <Share2 size={16} />
                    </button>
                    <button className="p-2 border border-[#141414]/10 rounded-lg hover:bg-[#141414] hover:text-[#E4E3E0] transition-all">
                      <Download size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 flex flex-col relative">
                {generating ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <Loader2 className="animate-spin text-[#141414] w-12 h-12" />
                      <Sparkles className="absolute -top-2 -right-2 text-[#141414] w-5 h-5 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <p className="font-serif italic text-lg">Synthesizing Schema...</p>
                      <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">Gemini 3 Flash Processing</p>
                    </div>
                  </div>
                ) : diagram ? (
                  <AnimatePresence mode="wait">
                    {activeTab === 'diagram' ? (
                      <motion.div 
                        key="diagram"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="w-full"
                      >
                        <Diagram chart={diagram} />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="analysis"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="w-full"
                      >
                        <AnalysisAgent 
                          papers={selectedPapers} 
                          mainDiagram={diagram} 
                          preloadedResult={analysisResult}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-center max-w-sm mx-auto">
                    <div className="w-16 h-16 border border-[#141414]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 opacity-20">
                      <Network size={32} />
                    </div>
                    <p className="font-serif italic text-lg opacity-40">Select papers and click generate to visualize technical architectures.</p>
                    <p className="text-[10px] uppercase tracking-widest opacity-20 mt-4 leading-relaxed">
                      The engine uses multimodal synthesis to convert natural language research into schema-validated Mermaid diagrams.
                    </p>
                  </div>
                )}

                {error && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border border-[#141414]/10 rounded-xl text-[#141414] text-[10px] uppercase tracking-widest flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                      {error}
                    </div>
                    <button 
                      onClick={() => setError(null)}
                      className="hover:opacity-50 transition-opacity"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Stats */}
            <footer className="mt-12 pt-8 border-t border-[#141414]/10 grid grid-cols-3 gap-8">
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40 block mb-1">Processing Mode</span>
                <span className="text-xs font-medium">Neural Synthesis</span>
              </div>
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40 block mb-1">Data Source</span>
                <span className="text-xs font-medium">arXiv.org API</span>
              </div>
              <div>
                <span className="text-[9px] font-mono uppercase tracking-widest opacity-40 block mb-1">Validation</span>
                <span className="text-xs font-medium">Mermaid Schema v11</span>
              </div>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}

