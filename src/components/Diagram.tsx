import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

interface DiagramProps {
  chart: string;
}

export const Diagram: React.FC<DiagramProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      const renderDiagram = async () => {
        try {
          // Clear previous content
          if (ref.current) ref.current.innerHTML = '';
          
          // Clean the chart code
          let cleanChart = chart.trim();
          
          // Handle literal \n strings that sometimes appear in JSON responses
          cleanChart = cleanChart.replace(/\\n/g, '\n');
          
          if (cleanChart.startsWith('```')) {
            cleanChart = cleanChart.replace(/^```(?:mermaid)?\n?/, '').replace(/\n?```$/, '');
          }
          if (cleanChart.startsWith('mermaid')) {
            cleanChart = cleanChart.replace(/^mermaid\n?/, '');
          }

          // Fix common error: "graph TD" followed immediately by a quote or bracket
          // Mermaid requires a space or newline after the direction
          cleanChart = cleanChart.replace(/^(graph\s+[TDBRLR]{2})([^\s\n])/, '$1\n$2');
          
          // Fix escaped quotes that AI sometimes adds
          cleanChart = cleanChart.replace(/\\"/g, '"');

          const id = `mermaid-${Math.random().toString(36).substring(2, 9)}`;
          
          // Mermaid.render can throw or return an error SVG if syntax is wrong
          const { svg } = await mermaid.render(id, cleanChart);
          
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
        } catch (error) {
          console.error('Mermaid render error:', error);
          
          // Try to fix common syntax errors if it failed
          // Sometimes AI adds extra characters or forgets quotes
          
          if (ref.current) {
            ref.current.innerHTML = `
              <div class="flex flex-col items-center justify-center py-12 opacity-40 text-center">
                <div class="text-[10px] uppercase tracking-widest mb-2">Visual Synthesis Error</div>
                <p class="text-xs italic font-serif max-w-xs mx-auto">The generated diagram contains syntax that Mermaid could not parse. The deep analysis below still contains the full research synthesis.</p>
                <div class="mt-4 p-2 bg-black/5 rounded font-mono text-[8px] overflow-hidden max-w-full">
                   ${chart.substring(0, 100)}...
                </div>
              </div>
            `;
          }
        }
      };
      
      renderDiagram();
    }
  }, [chart]);

  return (
    <div className="w-full overflow-x-auto bg-white p-6 rounded-2xl border border-black/5 shadow-sm">
      <div ref={ref} className="flex justify-center" />
    </div>
  );
};
