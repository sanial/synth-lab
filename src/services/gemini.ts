import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function* synthesizeStream(papers: { title: string; summary: string }[]) {
  const combinedSummary = papers.map(p => `Title: ${p.title}\nSummary: ${p.summary}`).join("\n\n---\n\n");
  
  const prompt = `
    Analyze these ${papers.length} research papers and create a technical architecture diagram.
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
    ANALYSIS: This architecture...
  `;

  try {
    const stream = await ai.models.generateContentStream({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield chunk.text;
      }
    }
  } catch (error) {
    console.error("Error in streaming synthesis:", error);
    throw error;
  }
}

export async function synthesizeAll(papers: { title: string; summary: string }[]) {
  const combinedSummary = papers.map(p => `Title: ${p.title}\nSummary: ${p.summary}`).join("\n\n---\n\n");
  
  const prompt = `
    Analyze these ${papers.length} research papers.
    1. Synthesize them into a single, unified technical architecture diagram (Mermaid.js graph TD).
    2. Provide a deep analysis of how the ideas come together, their key differences, and technical implications (around 150 words).
    3. Generate 2 smaller Mermaid diagrams visualizing specific details.
    
    Papers:
    ${combinedSummary}
    
    Mermaid Syntax Rules (CRITICAL):
    - Start with "graph TD" followed IMMEDIATELY by a NEWLINE.
    - IMPORTANT: The first node definition MUST be on a new line, NOT on the same line as "graph TD".
    - Use unique alphanumeric IDs for nodes (e.g., A, B, C).
    - ALWAYS wrap descriptive node labels in double quotes and square brackets. Example: A["Input Sequence (2024)"]
    - Node labels MUST NOT contain newlines. Use spaces instead.
    - Correct structure:
      graph TD
        A["Start"] --> B["Process"]
    - Avoid using reserved words like "end", "graph", "subgraph" as node IDs.
    - Ensure all arrows are valid (e.g., -->, ---, ==>, -- text -->).
    - Do not use brackets [] or () directly in node IDs.
    - If using circular nodes, use (( )) correctly: A(("Label")). But prefer square brackets [] for reliability.
    
    Return the response in JSON format:
    {
      "diagram": "mermaid code for main synthesis",
      "analysis": "text analysis...",
      "subDiagrams": ["mermaid code 1", "mermaid code 2"]
    }
  `;

  try {
    const textResponse = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            diagram: { type: Type.STRING },
            analysis: { type: Type.STRING },
            subDiagrams: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["diagram", "analysis", "subDiagrams"]
        }
      }
    });

    const result = JSON.parse(textResponse.text || "{}");

    return {
      diagram: result.diagram,
      analysis: result.analysis,
      subDiagrams: result.subDiagrams
    };
  } catch (error) {
    console.error("Error in comprehensive synthesis:", error);
    throw error;
  }
}

export async function generateAudio(text: string) {
  try {
    const audioResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say in a professional tone: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return audioResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("Error generating audio:", error);
    return null;
  }
}

export async function expandFlowTopic(topic: string, contextSummaries: string[]) {
  const context = contextSummaries.join("\n\n---\n\n");
  const prompt = `
    Expand this technical topic into a few direct child topics for a flow diagram.

    Parent topic: ${topic}

    Research context:
    ${context || 'No additional context provided.'}

    Requirements:
    - Return 3 to 5 child topics.
    - Each child must be short (2 to 6 words) and technical.
    - Keep items concrete, not generic.

    Return only JSON with this shape:
    {
      "children": ["child topic 1", "child topic 2", "child topic 3"]
    }
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          children: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["children"]
      }
    }
  });

  const raw = (response.text || "").trim();

  let parsedChildren: string[] = [];
  try {
    const cleaned = raw.replace(/```json|```/gi, '').trim();
    const parsed = JSON.parse(cleaned || "{\"children\":[]}");
    parsedChildren = Array.isArray(parsed.children)
      ? parsed.children.filter((item: unknown) => typeof item === 'string')
      : [];
  } catch {
    parsedChildren = raw
      .split('\n')
      .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 5);
  }

  const children = parsedChildren
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return children;
}
