import { GoogleGenAI, Type } from "@google/genai";
import { ArxivPaper } from "./arxiv";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

async function fetchPdfAsBase64(url: string): Promise<string> {
  const proxyUrl = `/api/pdf?url=${encodeURIComponent(url)}`;
  try {
    const response = await fetch(proxyUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error fetching PDF from ${url}:`, error);
    throw error;
  }
}

/**
 * Stage 1: The Researcher Agent
 * Extracts raw insights, metrics, and comparative points from the PDFs.
 */
async function extractResearchInsights(pdfParts: any[], papers: ArxivPaper[]): Promise<string> {
  const prompt = `
    You are a Senior Research Analyst. Your task is to perform an exhaustive analysis of these ${papers.length} research papers.
    
    1. EXTRACT: Key methodologies, specific performance metrics (accuracy, latency, parameters), and theoretical breakthroughs.
    2. COMPARE: Create a detailed cross-paper comparison. Identify where they agree, where they diverge, and what unique contributions each makes.
    3. FIGURES: Analyze descriptions of figures and tables to find specific data points.
    
    Output a comprehensive internal research report in Markdown. Be extremely specific with numbers and technical terms.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ parts: [...pdfParts, { text: prompt }] }],
    config: { temperature: 0.2 }
  });

  return response.text || "No insights extracted.";
}

/**
 * Stage 2: The Visualization Designer Agent
 * Maps the research insights to Mermaid.js diagrams.
 */
async function generateVisualizations(insights: string, papers: ArxivPaper[]): Promise<ConceptualAnalysis> {
  const prompt = `
    You are a Data Visualization Expert and Mermaid.js specialist. Based on the following research insights, generate 2-3 distinct Mermaid.js diagrams that best represent the comparison between these papers: ${papers.map(p => p.title).join(', ')}.
    
    RESEARCH INSIGHTS:
    ${insights}
    
    DIAGRAM TYPES & SYNTAX (FOLLOW EXACTLY):
    - mindmap: For hierarchical concepts. Syntax: mindmap\n  root\n    child1\n    child2
    - timeline: For chronological milestones. Syntax: timeline\n  title Timeline Title\n  section Period\n    Event : Description
    - flowchart: For processes or logic. Syntax: flowchart TD\n  A["Label A"] --> B["Label B"]
    - sequence: For interactions. Syntax: sequenceDiagram\n  Participant A->>Participant B: Message
    - architecture: Use 'block-beta' for architecture. Syntax: block-beta\n  columns 3\n  block1 block2 block3
    - quadrant: For comparing papers on two axes. Syntax:
      quadrantChart
        title "Comparison Title"
        x-axis "Left Label" --> "Right Label"
        y-axis "Bottom Label" --> "Top Label"
        quadrant-1 "Upper Right Label"
        quadrant-2 "Upper Left Label"
        quadrant-3 "Lower Left Label"
        quadrant-4 "Lower Right Label"
        "Paper A": [0.4, 0.6]
        "Paper B": [0.7, 0.2]
    
    CRITICAL MERMAID RULES:
    1. The "code" field MUST contain valid Mermaid.js syntax.
    2. Do NOT include markdown code blocks (like \`\`\`mermaid) inside the "code" field string.
    3. Start every diagram with the type (e.g., flowchart TD, mindmap, timeline) followed IMMEDIATELY by a NEWLINE.
    4. For quadrantChart: 
       - Axis syntax MUST be: x-axis "Label A" --> "Label B"
       - You MUST use the " --> " separator between the two labels.
       - Labels MUST be wrapped in double quotes if they contain spaces or special characters.
       - KEEP LABELS CONCISE (2-3 words max) to avoid overlapping text in the chart.
       - Ensure data point labels are also short.
       - The title MUST be wrapped in double quotes.
    5. For flowchart: ALWAYS wrap node labels in double quotes and square brackets. Example: A["Technical Stack"].
    6. Node labels MUST NOT contain newlines. Use spaces instead.
    7. Avoid special characters like parentheses, brackets, or semicolons inside labels unless they are properly quoted.
    8. Ensure the diagrams are complex and informative, reflecting the actual research.
    
    Return the final analysis in JSON format.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ text: prompt }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          comparison: { type: Type.STRING, description: "A summary of the comparative analysis" },
          figuresAnalysis: { type: Type.STRING, description: "Detailed analysis of metrics and specs" },
          visualizations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['mindmap', 'timeline', 'architecture', 'flowchart', 'sequence', 'quadrant'] },
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                code: { type: Type.STRING }
              },
              required: ["type", "title", "description", "code"]
            }
          }
        },
        required: ["comparison", "figuresAnalysis", "visualizations"]
      }
    }
  });

  const result = JSON.parse(response.text || "{}");
  
  // Post-processing: Filter out visualizations with empty code
  if (result.visualizations) {
    result.visualizations = result.visualizations.filter((v: any) => {
      const hasCode = v.code && v.code.trim().length > 0;
      if (!hasCode) console.warn(`Service: Filtering out empty visualization ${v.type}`);
      return hasCode;
    });
  }

  return result;
}

export async function performConceptualDive(papers: ArxivPaper[]): Promise<ConceptualAnalysis> {
  console.log(`ConceptualDive: Starting multi-agent pipeline for ${papers.length} papers...`);
  
  const pdfParts = await Promise.all(papers.map(async (paper) => {
    try {
      const pdfUrl = paper.link.replace('abs', 'pdf') + '.pdf';
      const base64 = await fetchPdfAsBase64(pdfUrl);
      return {
        inlineData: {
          data: base64,
          mimeType: 'application/pdf'
        }
      };
    } catch (err) {
      console.warn(`ConceptualDive: Falling back to summary for ${paper.title}`);
      return { text: `Paper Title: ${paper.title}\nSummary: ${paper.summary}` };
    }
  }));

  // Stage 1: Extract Insights
  console.log("ConceptualDive: Stage 1 - Extracting Research Insights...");
  const insights = await extractResearchInsights(pdfParts, papers);
  
  // Stage 2: Generate Visualizations
  console.log("ConceptualDive: Stage 2 - Mapping Insights to Visualizations...");
  const result = await generateVisualizations(insights, papers);
  
  if (!result.visualizations) {
    result.visualizations = [];
  }
  
  return result;
}
