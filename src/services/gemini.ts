interface PaperInput {
  title: string;
  summary: string;
}

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

export async function* synthesizeStream(papers: PaperInput[]) {
  const payload = await postJson<{ text: string }>("/api/gemini/synthesize-stream", { papers });
  if (payload.text) {
    yield payload.text;
  }
}

export async function synthesizeAll(papers: PaperInput[]) {
  return postJson<{ diagram: string; analysis: string; subDiagrams: string[] }>(
    "/api/gemini/synthesize-all",
    { papers }
  );
}

export async function generateAudio(text: string) {
  const payload = await postJson<{ audioData: string | null }>("/api/gemini/generate-audio", { text });
  return payload.audioData;
}

export async function expandFlowTopic(topic: string, contextSummaries: string[]) {
  const payload = await postJson<{ children: string[] }>("/api/gemini/expand-flow-topic", {
    topic,
    contextSummaries,
  });
  return Array.isArray(payload.children) ? payload.children.slice(0, 5) : [];
}
