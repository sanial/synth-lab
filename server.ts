import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import { parseStringPromise } from "xml2js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import "dotenv/config";
import { GoogleGenAI, Type, Modality } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GEMINI_TEXT_MODEL = process.env.GEMINI_TEXT_MODEL || "gemini-2.5-flash";
const GEMINI_AUDIO_MODEL = process.env.GEMINI_AUDIO_MODEL || "gemini-2.5-flash-preview-tts";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;
  app.use(express.json({ limit: "2mb" }));

  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    return new GoogleGenAI({ apiKey });
  };

  const fetchPdfAsBase64 = async (url: string): Promise<string> => {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      timeout: 20000,
    });

    return Buffer.from(response.data).toString("base64");
  };

  // arXiv Proxy with retry logic
  app.get("/api/arxiv", async (req, res) => {
    const { search_query, start, max_results } = req.query;
    const maxRetries = 3;
    let retryCount = 0;

    const fetchArxiv = async (): Promise<any> => {
      try {
        const response = await axios.get("http://export.arxiv.org/api/query", {
          params: { search_query, start, max_results },
          timeout: 10000,
        });
        return await parseStringPromise(response.data);
      } catch (error: any) {
        if (error.response?.status === 429 && retryCount < maxRetries) {
          retryCount++;
          const delay = Math.pow(2, retryCount) * 1000;
          console.log(`arXiv rate limited. Retrying in ${delay}ms... (Attempt ${retryCount}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchArxiv();
        }
        throw error;
      }
    };

    try {
      const result = await fetchArxiv();
      res.json(result);
    } catch (error: any) {
      console.error("arXiv proxy error:", error.message);
      const status = error.response?.status || 500;
      res.status(status).json({ 
        error: "Failed to fetch from arXiv", 
        details: error.message,
        status: status
      });
    }
  });

  // PDF Proxy
  app.get("/api/pdf", async (req, res) => {
    try {
      const { url } = req.query;
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: "URL is required" });
      }
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      res.set('Content-Type', 'application/pdf');
      res.send(response.data);
    } catch (error) {
      console.error("PDF proxy error:", error);
      res.status(500).json({ error: "Failed to fetch PDF" });
    }
  });

  app.post("/api/gemini/synthesize-stream", async (req, res) => {
    try {
      const papers = Array.isArray(req.body?.papers) ? req.body.papers : [];
      const combinedSummary = papers
        .map((p: { title?: string; summary?: string }) => `Title: ${p.title || ""}\nSummary: ${p.summary || ""}`)
        .join("\n\n---\n\n");

      const prompt = `Analyze these ${papers.length} research papers and create a technical architecture diagram.
Output the diagram as a series of nodes and edges in the following format:
NODE: ID | LABEL | TYPE (one of: input, output, default)
EDGE: SOURCE_ID | TARGET_ID | LABEL (optional)

After the diagram, provide a deep analysis starting with "ANALYSIS:".

Papers:
${combinedSummary}

Example:
NODE: A | Data Source | input
NODE: B | Processing | default
EDGE: A | B | stream
ANALYSIS: This architecture...`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
      });

      res.json({ text: response.text || "" });
    } catch (error: any) {
      console.error("Gemini synthesize-stream error:", error);
      res.status(500).json({
        error: "Failed to process research",
        details: error?.message || "Unknown error",
      });
    }
  });

  app.post("/api/gemini/synthesize-all", async (req, res) => {
    try {
      const papers = Array.isArray(req.body?.papers) ? req.body.papers : [];
      const maxSummaryLength = 3000;
      let combinedSummary = papers
        .map((p: { title?: string; summary?: string }) => `Title: ${p.title || ""}\nSummary: ${p.summary || ""}`)
        .join("\n\n---\n\n");
      if (combinedSummary.length > maxSummaryLength) {
        combinedSummary = combinedSummary.substring(0, maxSummaryLength) + "\n[... truncated ...]";
      }

      const prompt = `Analyze these ${papers.length} research papers.
1. Synthesize them into a single, unified technical architecture diagram (Mermaid.js graph TD).
2. Provide a deep analysis of how the ideas come together, their key differences, and technical implications (around 150 words).
3. Generate 2 smaller Mermaid diagrams visualizing specific details.

Papers:
${combinedSummary}

Mermaid Syntax Rules (CRITICAL):
- Start with "graph TD" followed IMMEDIATELY by a NEWLINE.
- The first node definition MUST be on a new line, NOT on the same line as "graph TD".
- Use unique alphanumeric IDs for nodes (e.g., A, B, C).
- ALWAYS wrap descriptive node labels in double quotes and square brackets. Example: A["Input Sequence (2024)"]
- Node labels MUST NOT contain newlines. Use spaces instead.

Return the response in JSON format:
{
  "diagram": "mermaid code for main synthesis",
  "analysis": "text analysis...",
  "subDiagrams": ["mermaid code 1", "mermaid code 2"]
}`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              diagram: { type: Type.STRING },
              analysis: { type: Type.STRING },
              subDiagrams: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["diagram", "analysis", "subDiagrams"],
          },
        },
      });

      const parsed = JSON.parse(response.text || "{}");
      res.json({
        diagram: parsed.diagram || "",
        analysis: parsed.analysis || "",
        subDiagrams: Array.isArray(parsed.subDiagrams) ? parsed.subDiagrams : [],
      });
    } catch (error: any) {
      console.error("Gemini synthesize-all error:", error);
      res.status(500).json({
        error: "Failed to process research",
        details: error?.message || "Unknown error",
      });
    }
  });

  app.post("/api/gemini/generate-audio", async (req, res) => {
    try {
      const text = typeof req.body?.text === "string" ? req.body.text : "";
      const limitedText = text.substring(0, 500);
      const ai = getAiClient();

      const audioResponse = await ai.models.generateContent({
        model: GEMINI_AUDIO_MODEL,
        contents: `Say in a professional, engaging tone: ${limitedText}`,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: "Kore" },
            },
          },
        },
      });

      const audioData = audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
      res.json({ audioData });
    } catch (error: any) {
      console.error("Gemini generate-audio error:", error);
      res.status(500).json({
        error: "Failed to generate audio",
        details: error?.message || "Unknown error",
      });
    }
  });

  app.post("/api/gemini/expand-flow-topic", async (req, res) => {
    try {
      const topic = typeof req.body?.topic === "string" ? req.body.topic : "";
      const contextSummaries = Array.isArray(req.body?.contextSummaries) ? req.body.contextSummaries : [];
      const context = contextSummaries.join("\n\n---\n\n");
      const prompt = `Expand this technical topic into a few direct child topics for a flow diagram.

Parent topic: ${topic}

Research context:
${context || "No additional context provided."}

Requirements:
- Return 3 to 5 child topics.
- Each child must be short (2 to 6 words) and technical.
- Keep items concrete, not generic.

Return only JSON with this shape:
{
  "children": ["child topic 1", "child topic 2", "child topic 3"]
}`;

      const ai = getAiClient();
      const response = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              children: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["children"],
          },
        },
      });

      const raw = (response.text || "").trim();
      let parsedChildren: string[] = [];
      try {
        const cleaned = raw.replace(/```json|```/gi, "").trim();
        const parsed = JSON.parse(cleaned || '{"children":[]}');
        parsedChildren = Array.isArray(parsed.children)
          ? parsed.children.filter((item: unknown) => typeof item === "string")
          : [];
      } catch {
        parsedChildren = raw
          .split("\n")
          .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
          .filter(Boolean)
          .slice(0, 5);
      }

      const children = parsedChildren.map((item) => item.trim()).filter(Boolean).slice(0, 5);
      res.json({ children });
    } catch (error: any) {
      console.error("Gemini expand-flow-topic error:", error);
      res.status(500).json({
        error: "Failed to expand topic",
        details: error?.message || "Unknown error",
      });
    }
  });

  app.post("/api/gemini/conceptual-dive", async (req, res) => {
    try {
      const papers = Array.isArray(req.body?.papers) ? req.body.papers : [];

      if (papers.length === 0) {
        return res.status(400).json({
          error: "No papers provided",
          details: "At least one paper is required for a conceptual dive.",
        });
      }

      const pdfParts = await Promise.all(
        papers.map(async (paper: { title?: string; summary?: string; link?: string }) => {
          try {
            const pdfUrl = `${String(paper.link || "").replace("abs", "pdf")}.pdf`;
            const base64 = await fetchPdfAsBase64(pdfUrl);
            return {
              inlineData: {
                data: base64,
                mimeType: "application/pdf",
              },
            };
          } catch {
            return {
              text: `Paper Title: ${paper.title || "Untitled"}\nSummary: ${paper.summary || "No summary provided."}`,
            };
          }
        }),
      );

      const insightsPrompt = `
You are a Senior Research Analyst. Your task is to perform an exhaustive analysis of these ${papers.length} research papers.

1. EXTRACT: Key methodologies, specific performance metrics (accuracy, latency, parameters), and theoretical breakthroughs.
2. COMPARE: Create a detailed cross-paper comparison. Identify where they agree, where they diverge, and what unique contributions each makes.
3. FIGURES: Analyze descriptions of figures and tables to find specific data points.

Output a comprehensive internal research report in Markdown. Be extremely specific with numbers and technical terms.
      `;

      const ai = getAiClient();
      const insightsResponse = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [{ parts: [...pdfParts, { text: insightsPrompt }] }],
        config: { temperature: 0.2 },
      });

      const insights = insightsResponse.text || "No insights extracted.";

      const visualizationPrompt = `
You are a Data Visualization Expert and Mermaid.js specialist. Based on the following research insights, generate 2-3 distinct Mermaid.js diagrams that best represent the comparison between these papers: ${papers.map((paper: { title?: string }) => paper.title || "Untitled").join(", ")}.

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

      const visualizationResponse = await ai.models.generateContent({
        model: GEMINI_TEXT_MODEL,
        contents: [{ text: visualizationPrompt }],
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
                    type: { type: Type.STRING, enum: ["mindmap", "timeline", "architecture", "flowchart", "sequence", "quadrant"] },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    code: { type: Type.STRING },
                  },
                  required: ["type", "title", "description", "code"],
                },
              },
            },
            required: ["comparison", "figuresAnalysis", "visualizations"],
          },
        },
      });

      const parsed = JSON.parse(visualizationResponse.text || "{}");
      const visualizations = Array.isArray(parsed.visualizations)
        ? parsed.visualizations.filter((item: { code?: string }) => typeof item?.code === "string" && item.code.trim().length > 0)
        : [];

      res.json({
        comparison: typeof parsed.comparison === "string" ? parsed.comparison : "",
        figuresAnalysis: typeof parsed.figuresAnalysis === "string" ? parsed.figuresAnalysis : "",
        visualizations,
      });
    } catch (error: any) {
      console.error("Gemini conceptual-dive error:", error);
      res.status(500).json({
        error: "Failed to perform conceptual dive",
        details: error?.message || "Unknown error",
      });
    }
  });

  const distPath = path.resolve(__dirname, "dist");
  const hasDist = fs.existsSync(distPath);
  const isProduction = process.env.NODE_ENV === "production" || hasDist;

  // Vite middleware for development
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
