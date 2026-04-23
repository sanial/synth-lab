import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { sanitizeMermaidChart } from '../utils/mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  securityLevel: 'loose',
  fontFamily: 'Inter, sans-serif',
});

/**
 * Props for the Mermaid diagram renderer.
 */
interface DiagramProps {
  /** Raw Mermaid chart source code to sanitize and render. */
  chart: string;
}

/**
 * Renders sanitized Mermaid source into SVG and injects it into the view.
 * If rendering fails, shows a compact fallback error panel with a chart preview.
 *
 * @param props Component props.
 * @param props.chart Mermaid chart source string.
 * @returns Rendered diagram container.
 */
export const Diagram: React.FC<DiagramProps> = ({ chart }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current && chart) {
      /**
       * Sanitizes and renders Mermaid source into the component container.
       *
       * @returns Promise that resolves once rendering or fallback completes.
       */
      const renderDiagram = async () => {
        try {
          // Clear previous content
          if (ref.current) ref.current.innerHTML = '';
          
          let cleanChart = sanitizeMermaidChart(chart);

          // Fix common error: using quotes directly after graph TD without node ID
          if (cleanChart.match(/^graph\s+\w+\s*"/)) {
            cleanChart = cleanChart.replace(/^(graph\s+\w+\s*)(".*")/, '$1A[$2]');
          }

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
