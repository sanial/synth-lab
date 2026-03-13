import { GoogleGenAI, Type, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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
    - Use "graph TD" for flowcharts.
    - ALWAYS wrap node labels in double quotes if they contain special characters like parentheses, brackets, colons, or commas. Example: A["Process (Step 1)"]
    - Avoid using reserved words like "end", "graph", "subgraph" as node IDs.
    - Ensure all arrows are valid (e.g., -->, ---, ==>, -- text -->).
    - Do not use brackets [] or () directly in node IDs.
    
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
