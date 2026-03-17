import { ArxivPaper } from "./arxiv";

export interface Visualization {
  type: 'mindmap' | 'timeline' | 'architecture' | 'flowchart' | 'sequence' | 'quadrant';
  code: string;
  title: string;
  description: string;
}

export interface ConceptualAnalysis {
  comparison: string;
  visualizations: Visualization[];
  figuresAnalysis: string;
}

export async function performConceptualDive(papers: ArxivPaper[]): Promise<ConceptualAnalysis> {
  const response = await fetch("/api/gemini/conceptual-dive", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ papers }),
  });

  const rawText = await response.text();
  let payload: Partial<ConceptualAnalysis> & { details?: string } = {};

  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const details = typeof payload.details === "string"
      ? payload.details
      : rawText || `HTTP ${response.status} ${response.statusText}`;
    throw new Error(details);
  }

  return {
    comparison: typeof payload.comparison === "string" ? payload.comparison : "",
    figuresAnalysis: typeof payload.figuresAnalysis === "string" ? payload.figuresAnalysis : "",
    visualizations: Array.isArray(payload.visualizations) ? payload.visualizations : [],
  };
}
