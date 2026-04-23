/**
 * Minimal paper payload used by Gemini synthesis endpoints.
 */
interface PaperInput {
  title: string;
  summary: string;
}

/**
 * Sends a JSON POST request and returns the parsed JSON payload.
 * Throws a normalized Error when the response is not successful.
 *
 * @typeParam T Expected response payload shape.
 * @param url Relative API endpoint.
 * @param body Request body to serialize as JSON.
 * @returns Parsed JSON payload.
 */
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const rawText = await response.text();
  let payload: any = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const details = typeof payload?.details === "string"
      ? payload.details
      : rawText
      ? rawText.slice(0, 300)
      : `HTTP ${response.status} ${response.statusText}`;
    throw new Error(details);
  }

  return payload as T;
}

/**
 * Requests a technical synthesis in stream-like text format.
 *
 * @param papers Papers to synthesize.
 * @yields Text chunk that includes NODE/EDGE lines and optional analysis.
 */
export async function* synthesizeStream(papers: PaperInput[]) {
  const payload = await postJson<{ text: string }>("/api/gemini/synthesize-stream", { papers });
  if (payload.text) {
    yield payload.text;
  }
}

/**
 * Requests a full synthesis package including main Mermaid diagram,
 * narrative analysis, and supporting sub-diagrams.
 *
 * @param papers Papers to synthesize.
 * @returns Aggregated synthesis payload.
 */
export async function synthesizeAll(papers: PaperInput[]) {
  return postJson<{ diagram: string; analysis: string; subDiagrams: string[] }>(
    "/api/gemini/synthesize-all",
    { papers }
  );
}

/**
 * Generates narration audio for analysis text.
 *
 * @param text Analysis text to convert to audio.
 * @returns Base64-encoded audio payload or null if unavailable.
 */
export async function generateAudio(text: string) {
  const payload = await postJson<{ audioData: string | null }>("/api/gemini/generate-audio", { text });
  return payload.audioData;
}

/**
 * Expands a selected flow topic into short child topics.
 *
 * @param topic Parent topic label.
 * @param contextSummaries Paper context used to guide expansion.
 * @returns Up to 5 child topic labels.
 */
export async function expandFlowTopic(topic: string, contextSummaries: string[]) {
  const payload = await postJson<{ children: string[] }>("/api/gemini/expand-flow-topic", {
    topic,
    contextSummaries,
  });
  return Array.isArray(payload.children) ? payload.children.slice(0, 5) : [];
}
