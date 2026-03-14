import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Loader2, Sparkles, AlertCircle, BarChart3, Network, GitBranch, History, CircleDot, Layers, Share2, Workflow, LayoutGrid, Compass } from 'lucide-react';
import { ArxivPaper } from '../services/arxiv';
import { performConceptualDive, ConceptualAnalysis, Visualization } from '../services/conceptualDive';
import mermaid from 'mermaid';
import Markdown from 'react-markdown';

// Initialize mermaid
mermaid.initialize({
  startOnLoad: true,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

interface ConceptualDiveProps {
  papers: ArxivPaper[];
  analysis: ConceptualAnalysis | null;
  setAnalysis: (analysis: ConceptualAnalysis | null) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

export function ConceptualDive({ papers, analysis, setAnalysis, loading, setLoading }: ConceptualDiveProps) {
  const [error, setError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const handleDive = async () => {
    console.log("ConceptualDive: handleDive triggered");
    setLoading(true);
    setError(null);
    try {
      console.log("ConceptualDive: Calling performConceptualDive with papers:", papers.map(p => p.title));
      const result = await performConceptualDive(papers);
      console.log("ConceptualDive: Analysis result received:", result);
      setAnalysis(result);
    } catch (err) {
      console.error('ConceptualDive: Error during dive:', err);
      setError('Failed to perform conceptual dive. The papers might be too large or the AI is busy.');
    } finally {
      setLoading(false);
    }
  };

  if (papers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-40 text-center p-12">
        <Network size={48} className="mb-4" />
        <p className="font-serif italic text-lg">No papers selected for conceptual dive.</p>
        <p className="text-[10px] uppercase tracking-widest mt-2">Select multiple papers to compare methodologies and results.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowDebug(!showDebug)}
          className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
        >
          {showDebug ? 'Hide Debug Data' : 'Show Debug Data'}
        </button>
      </div>

      {showDebug && analysis && (
        <div className="p-4 bg-black text-green-400 font-mono text-xs rounded-xl overflow-auto max-h-60">
          <pre>{JSON.stringify(analysis.visualizations, null, 2)}</pre>
        </div>
      )}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="relative">
            <Loader2 className="animate-spin text-[#141414] w-12 h-12" />
            <Sparkles className="absolute -top-2 -right-2 text-[#141414] w-5 h-5 animate-pulse" />
          </div>
          <div className="text-center">
            <p className="font-serif italic text-lg">Performing Multimodal Analysis...</p>
            <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">Parsing figures and specifications from PDFs</p>
          </div>
        </div>
      ) : error ? (
        <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-2xl flex items-start gap-4">
          <AlertCircle className="text-red-500 shrink-0" />
          <div>
            <h3 className="font-medium text-red-500 mb-1">Conceptual Dive Failed</h3>
            <p className="text-sm opacity-70">{error}</p>
            <button 
              onClick={handleDive}
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors"
            >
              Retry Analysis
            </button>
          </div>
        </div>
      ) : analysis ? (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          {/* Visualizations Section */}
          <section className="space-y-8">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-[#141414] rounded-lg">
                <Layers className="text-white w-4 h-4" />
              </div>
              <h3 className="font-serif italic text-xl">Conceptual Mappings</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-8">
              {analysis.visualizations.map((viz, idx) => (
                <VisualizationCard key={idx} visualization={viz} />
              ))}
            </div>
          </section>

          {/* Comparison Text */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <section>
              <h3 className="font-serif italic text-xl mb-6">Comparative Analysis</h3>
              <div className="prose prose-sm prose-neutral max-w-none">
                <Markdown>{analysis.comparison}</Markdown>
              </div>
            </section>

            <section>
              <h3 className="font-serif italic text-xl mb-6">Figures & Specifications</h3>
              <div className="prose prose-sm prose-neutral max-w-none bg-[#141414]/5 p-6 rounded-2xl">
                <Markdown>{analysis.figuresAnalysis}</Markdown>
              </div>
            </section>
          </div>
        </motion.div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20">
          <button 
            onClick={handleDive}
            className="px-8 py-4 bg-[#141414] text-white rounded-2xl font-serif italic text-lg hover:opacity-90 transition-all shadow-xl shadow-black/10 flex items-center gap-3"
          >
            <Sparkles size={20} />
            Start Conceptual Dive
          </button>
          <p className="text-[10px] uppercase tracking-widest opacity-40 mt-4">This will analyze all selected PDFs using Gemini 3</p>
        </div>
      )}
    </div>
  );
}

function VisualizationCard({ visualization }: { visualization: Visualization }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!visualization.code) {
        console.warn("VisualizationCard: No code provided for", visualization.title);
        return;
      }
      
      try {
        setError(null);
        const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
        console.log(`VisualizationCard: Rendering ${visualization.type} with ID ${id}`);
        
        // Ensure code is trimmed and starts with the type
        const cleanCode = visualization.code.trim();
        
        const { svg } = await mermaid.render(id, cleanCode);
        console.log(`VisualizationCard: Successfully rendered ${visualization.type}, SVG length: ${svg.length}`);
        
        if (!svg || svg.length < 10) {
          throw new Error("Generated SVG is empty or too small.");
        }
        
        setSvg(svg);
      } catch (err: any) {
        console.error("Mermaid render error:", err);
        // Extract a more useful error message if possible
        const errorMessage = err?.message || "Invalid Mermaid syntax";
        setError(`Failed to render ${visualization.type}: ${errorMessage}`);
      }
    };

    renderDiagram();
  }, [visualization]);

  return (
    <div className="bg-white border border-[#141414]/10 rounded-3xl p-8 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h4 className="font-serif italic text-lg">{visualization.title}</h4>
          <p className="text-[10px] uppercase tracking-widest opacity-40">{visualization.description}</p>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <button 
              onClick={() => {
                console.log("Raw Mermaid Code:", visualization.code);
                alert("Raw code logged to console for debugging.");
              }}
              className="text-[10px] px-2 py-1 bg-red-50 text-red-500 rounded border border-red-100 hover:bg-red-100 transition-colors"
            >
              Debug Code
            </button>
          )}
          <div className="p-2 bg-[#141414]/5 rounded-lg">
            {visualization.type === 'timeline' ? <History className="w-4 h-4" /> :
             visualization.type === 'mindmap' ? <Network className="w-4 h-4" /> :
             visualization.type === 'architecture' ? <Layers className="w-4 h-4" /> :
             visualization.type === 'flowchart' ? <Workflow className="w-4 h-4" /> :
             visualization.type === 'sequence' ? <Share2 className="w-4 h-4" /> :
             <Compass className="w-4 h-4" />}
          </div>
        </div>
      </div>
      
      <div className="bg-[#f9f9f9] rounded-2xl p-8 min-h-[450px] flex items-center justify-center overflow-auto border border-black/5">
        {error ? (
          <div className="text-center p-8 max-w-md">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4 opacity-20" />
            <p className="text-xs text-red-600 font-mono mb-4 leading-relaxed">{error}</p>
            <div className="bg-black/5 p-4 rounded-lg text-left overflow-auto max-h-40">
              <pre className="text-[10px] font-mono opacity-60 whitespace-pre-wrap">
                {visualization.code}
              </pre>
            </div>
          </div>
        ) : svg ? (
          <div 
            className="w-full h-full flex justify-center mermaid-container"
            dangerouslySetInnerHTML={{ __html: svg }} 
          />
        ) : (
          <Loader2 className="w-6 h-6 animate-spin opacity-20" />
        )}
      </div>
    </div>
  );
}
