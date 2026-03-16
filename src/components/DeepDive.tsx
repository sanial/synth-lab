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
  // const networkRef = useRef<SVGSVGElement>(null);

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

  // useEffect(() => {
  //   if (selectedPaperId && analyses[selectedPaperId] && networkRef.current) {
  //     renderNetworkChart(analyses[selectedPaperId]);
  //   }
  // }, [selectedPaperId, analyses]);

  // Re-render charts on window resize
  useEffect(() => {
    const handleResize = () => {
      if (selectedPaperId && analyses[selectedPaperId]) {
        if (svgRef.current) renderChart(analyses[selectedPaperId]);
        // if (networkRef.current) renderNetworkChart(analyses[selectedPaperId]);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedPaperId, analyses]);

  const renderChart = (analysis: PdfAnalysis) => {
    if (!svgRef.current) return;
    
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    
    // Get actual dimensions of the container
    const rect = svgRef.current.getBoundingClientRect();
    const width = rect.width || 900;
    const height = rect.height || 500;

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

  // const renderNetworkChart = (analysis: PdfAnalysis) => {
  //   if (!networkRef.current) return;
    
  //   const svg = d3.select(networkRef.current);
  //   svg.selectAll("*").remove();
    
  //   // Get actual dimensions of the container
  //   const rect = networkRef.current.getBoundingClientRect();
  //   const width = rect.width || 900;
  //   const height = rect.height || 500;

  //   const topWords = analysis.topWords.slice(0, 20);
    
  //   // Create nodes from keywords with proper typing
  //   const nodes: any[] = topWords.map((word, i) => ({
  //     id: word.word,
  //     name: word.word,
  //     count: word.count,
  //     group: Math.floor(i / 5), // Group keywords for better visualization
  //     radius: Math.max(5, Math.min(20, word.count / 2))
  //   }));

  //   // Create links based on keyword density similarity (simplified co-occurrence simulation)
  //   const links: any[] = [];
  //   for (let i = 0; i < nodes.length; i++) {
  //     for (let j = i + 1; j < nodes.length; j++) {
  //       const similarity = 1 / (1 + Math.abs((nodes[i] as any).count - (nodes[j] as any).count));
  //       if (similarity > 0.3) { // Only connect keywords with similar densities
  //         links.push({
  //           source: nodes[i].id as string,
  //           target: nodes[j].id as string,
  //           value: similarity
  //         });
  //       }
  //     }
  //   }

  //   // Create force simulation
  //   const simulation = d3.forceSimulation(nodes)
  //     .force("link", d3.forceLink(links).id((d: any) => d.id).distance(100))
  //     .force("charge", d3.forceManyBody().strength(-300))
  //     .force("center", d3.forceCenter(width / 2, height / 2))
  //     .force("collision", d3.forceCollide().radius((d: any) => d.radius + 5));

  //   // Create color scale for groups
  //   const color = d3.scaleOrdinal(d3.schemeTableau10);

  //   // Create links
  //   const link = svg.append("g")
  //     .attr("class", "links")
  //     .selectAll("line")
  //     .data(links)
  //     .enter().append("line")
  //     .attr("stroke", "#141414")
  //     .attr("stroke-opacity", 0.3)
  //     .attr("stroke-width", (d: any) => Math.sqrt(d.value) * 2);

  //   // Create nodes
  //   const node = svg.append("g")
  //     .attr("class", "nodes")
  //     .selectAll("circle")
  //     .data(nodes)
  //     .enter().append("circle")
  //     .attr("r", (d: any) => d.radius)
  //     .attr("fill", (d: any) => color(d.group.toString()))
  //     .attr("stroke", "#141414")
  //     .attr("stroke-width", 2)
  //     .style("cursor", "pointer")
  //     .call(d3.drag<any, any>()
  //       .on("start", (event, d) => {
  //         if (!event.active) simulation.alphaTarget(0.3).restart();
  //         d.fx = d.x;
  //         d.fy = d.y;
  //       })
  //       .on("drag", (event, d) => {
  //         d.fx = event.x;
  //         d.fy = event.y;
  //       })
  //       .on("end", (event, d) => {
  //         if (!event.active) simulation.alphaTarget(0);
  //         d.fx = null;
  //         d.fy = null;
  //       }));

  //   // Add labels
  //   const labels = svg.append("g")
  //     .attr("class", "labels")
  //     .selectAll("text")
  //     .data(nodes)
  //     .enter().append("text")
  //     .text((d: any) => d.name)
  //     .attr("font-family", "JetBrains Mono, monospace")
  //     .attr("font-size", (d: any) => Math.max(8, Math.min(14, d.radius)))
  //     .attr("text-anchor", "middle")
  //     .attr("dy", ".35em")
  //     .attr("pointer-events", "none")
  //     .attr("fill", "#141414")
  //     .attr("font-weight", (d: any) => d.count > analysis.topWords[0].count * 0.7 ? "bold" : "normal");

  //   // Add tooltips
  //   node.append("title")
  //     .text((d: any) => `${d.name}: ${d.count} occurrences`);

  //   // Update positions on simulation tick
  //   simulation.on("tick", () => {
  //     link
  //       .attr("x1", (d: any) => d.source.x)
  //       .attr("y1", (d: any) => d.source.y)
  //       .attr("x2", (d: any) => d.target.x)
  //       .attr("y2", (d: any) => d.target.y);

  //     node
  //       .attr("cx", (d: any) => d.x)
  //       .attr("cy", (d: any) => d.y);

  //     labels
  //       .attr("x", (d: any) => d.x)
  //       .attr("y", (d: any) => d.y);
  //   });

  //   // Add legend for high-density keywords
  //   const legend = svg.append("g")
  //     .attr("transform", "translate(20, 20)");

  //   legend.append("text")
  //     .attr("x", 0)
  //     .attr("y", 0)
  //     .attr("font-family", "JetBrains Mono, monospace")
  //     .attr("font-size", "12px")
  //     .attr("font-weight", "bold")
  //     .attr("fill", "#141414")
  //     .text("High-Density Keywords");

  //   const highDensityWords = topWords.slice(0, 5);
  //   highDensityWords.forEach((word, i) => {
  //     const g = legend.append("g")
  //       .attr("transform", `translate(0, ${20 + i * 15})`);

  //     g.append("circle")
  //       .attr("r", 4)
  //       .attr("fill", color(Math.floor(i / 5).toString()));

  //     g.append("text")
  //       .attr("x", 10)
  //       .attr("y", 4)
  //       .attr("font-family", "JetBrains Mono, monospace")
  //       .attr("font-size", "10px")
  //       .attr("fill", "#141414")
  //       .text(`${word.word} (${word.count})`);
  //     });
  // };

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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6 flex-1">
        <div className="space-y-6">
          {/* Existing Bubble Chart */}
          <div className="bg-[#E4E3E0]/30 rounded-2xl border border-[#141414]/5 p-4 flex flex-col">
            <div className="mb-4">
              <h3 className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Keyword Density Visualization</h3>
              <p className="text-xs opacity-60">Bubble size represents keyword frequency</p>
            </div>
            <div className="flex items-center justify-center min-h-[400px] w-full">
              {selectedPaperId && loading[selectedPaperId] ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#141414]/40" size={32} />
                  <p className="text-[10px] uppercase tracking-widest opacity-40">Parsing PDF Content...</p>
                </div>
              ) : currentAnalysis ? (
                <svg ref={svgRef} width="100%" height="100%" className="w-full h-full min-h-[400px]" />
              ) : (
                <p className="text-[10px] uppercase tracking-widest opacity-40">Select a paper to visualize</p>
              )}
            </div>
          </div>

          {/* New Network Chart */}
          {/* <div className="bg-[#E4E3E0]/30 rounded-2xl border border-[#141414]/5 p-4 flex flex-col">
            <div className="mb-4">
              <h3 className="text-[10px] uppercase tracking-widest opacity-40 mb-2">Keyword Interaction Network</h3>
              <p className="text-xs opacity-60">Connections show keyword relationships • Drag nodes to explore</p>
            </div>
            <div className="flex items-center justify-center min-h-[400px] w-full">
              {selectedPaperId && loading[selectedPaperId] ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-[#141414]/40" size={32} />
                  <p className="text-[10px] uppercase tracking-widest opacity-40">Building network...</p>
                </div>
              ) : currentAnalysis ? (
                <svg ref={networkRef} width="100%" height="100%" className="w-full h-full min-h-[400px]" />
              ) : (
                <p className="text-[10px] uppercase tracking-widest opacity-40">Select a paper to visualize</p>
              )}
            </div>
          </div> */}
        </div>

        <div className="space-y-6 lg:w-[200px]">
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
