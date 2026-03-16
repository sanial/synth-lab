import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ArxivPaper } from '../services/arxiv';
import { parsePdf, PdfAnalysis } from '../services/pdf';
import { Loader2, FileText, BarChart3, Info } from 'lucide-react';
import { motion } from 'motion/react';

interface DeepDiveProps {
  papers: ArxivPaper[];
  analyses: Record<string, PdfAnalysis>;
  setAnalyses: React.Dispatch<React.SetStateAction<Record<string, PdfAnalysis>>>;
  loading: Record<string, boolean>;
  setLoading: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  selectedPaperId: string | null;
  setSelectedPaperId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedNodeId?: string | null;
}

export const DeepDive: React.FC<DeepDiveProps> = ({ 
  papers, 
  analyses, 
  setAnalyses, 
  loading, 
  setLoading,
  selectedPaperId,
  setSelectedPaperId,
  selectedNodeId
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!selectedPaperId && papers.length > 0) {
      setSelectedPaperId(papers[0].id);
    }
  }, [papers, selectedPaperId]);

  useEffect(() => {
    papers.forEach(async (paper) => {
      if (!analyses[paper.id] && !loading[paper.id]) {
        setLoading(prev => ({ ...prev, [paper.id]: true }));
        try {
          const analysis = await parsePdf(paper.link.replace('abs', 'pdf') + '.pdf');
          setAnalyses(prev => ({ ...prev, [paper.id]: analysis }));
        } catch (err) {
          console.error(`Failed to parse PDF for ${paper.title}:`, err);
        } finally {
          setLoading(prev => ({ ...prev, [paper.id]: false }));
        }
      }
    });
  }, [papers]);

  useEffect(() => {
    if (selectedPaperId && analyses[selectedPaperId] && svgRef.current) {
      renderChart(analyses[selectedPaperId]);
    }
  }, [selectedPaperId, analyses]);

  const renderChart = (analysis: PdfAnalysis) => {
    const width = 800;
    const height = 500;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const data = analysis.topWords.slice(0, 30);
    
    const pack = d3.pack()
      .size([width, height])
      .padding(5);

    const root = d3.hierarchy({ children: data } as any)
      .sum((d: any) => d.count);

    const nodes = pack(root).leaves();

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const g = svg.append("g")
      .attr("transform", `translate(0,0)`);

    const node = g.selectAll(".node")
      .data(nodes)
      .enter().append("g")
      .attr("class", "node")
      .attr("transform", d => `translate(${d.x},${d.y})`);

    node.append("circle")
      .attr("r", 0)
      .style("fill", (d, i) => color(i.toString()))
      .style("fill-opacity", 0.7)
      .style("stroke", "#141414")
      .style("stroke-width", 1)
      .transition()
      .duration(1000)
      .attr("r", d => d.r);

    node.append("text")
      .attr("dy", ".3em")
      .style("text-anchor", "middle")
      .style("font-size", d => Math.min(d.r / 3, 12) + "px")
      .style("font-family", "JetBrains Mono, monospace")
      .style("pointer-events", "none")
      .text(d => (d.data as any).word)
      .style("fill-opacity", 0)
      .transition()
      .delay(500)
      .duration(500)
      .style("fill-opacity", 1);

    node.append("title")
      .text(d => `${(d.data as any).word}: ${(d.data as any).count} occurrences`);
  };

  if (papers.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
        <div className="w-16 h-16 border border-[#141414]/10 rounded-2xl flex items-center justify-center mx-auto mb-6 opacity-20">
          <BarChart3 size={32} />
        </div>
        <p className="font-serif italic text-lg opacity-40">Select papers to begin deep dive analysis.</p>
      </div>
    );
  }

  const currentAnalysis = selectedPaperId ? analyses[selectedPaperId] : null;

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {papers.map(paper => (
          <button
            key={paper.id}
            onClick={() => setSelectedPaperId(paper.id)}
            className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest border transition-all whitespace-nowrap flex items-center gap-2 ${
              selectedPaperId === paper.id
                ? "bg-[#141414] text-[#E4E3E0] border-[#141414]"
                : "bg-white border-[#141414]/10 text-[#141414]/60 hover:border-[#141414]/30"
            }`}
          >
            {loading[paper.id] ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
            <span className="max-w-[150px] truncate">{paper.title}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-6 flex-1">
        <div className="bg-[#E4E3E0]/30 rounded-2xl border border-[#141414]/5 p-4 flex items-center justify-center min-h-[500px]">
          {selectedPaperId && loading[selectedPaperId] ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="animate-spin text-[#141414]/40" size={32} />
              <p className="text-[10px] uppercase tracking-widest opacity-40">Parsing PDF Content...</p>
            </div>
          ) : currentAnalysis ? (
            <svg ref={svgRef} width="100%" height="500" viewBox="0 0 800 500" preserveAspectRatio="xMidYMid meet" />
          ) : (
            <p className="text-[10px] uppercase tracking-widest opacity-40">Select a paper to visualize</p>
          )}
        </div>

        <div className="space-y-6">
          {currentAnalysis && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-6"
            >
              <div>
                <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                  <Info size={12} />
                  Document Metadata
                </h4>
                <div className="space-y-3">
                  <div className="p-3 bg-white rounded-xl border border-[#141414]/5">
                    <span className="text-[9px] uppercase opacity-40 block mb-1">Total Words</span>
                    <span className="text-sm font-mono font-medium">{currentAnalysis.wordCount.toLocaleString()}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-[#141414]/5">
                    <span className="text-[9px] uppercase opacity-40 block mb-1">Page Count</span>
                    <span className="text-sm font-mono font-medium">{currentAnalysis.pageCount}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[10px] uppercase tracking-widest opacity-40 mb-3 flex items-center gap-2">
                  <BarChart3 size={12} />
                  Keyword Density
                </h4>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  {currentAnalysis.topWords.slice(0, 10).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] font-mono">
                      <span className="opacity-60">{item.word}</span>
                      <span className="font-bold">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};
