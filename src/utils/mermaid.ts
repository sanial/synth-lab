/**
 * Normalizes a Mermaid label value and ensures it is wrapped in double quotes.
 *
 * Behavior:
 * - Replaces newlines with spaces.
 * - Preserves empty labels by returning the original input.
 * - Converts single-quoted labels to double-quoted labels.
 * - Escapes inner double quotes.
 *
 * @param label Raw node/subgraph label content.
 * @returns A Mermaid-safe quoted label string.
 */
function quoteLabelContent(label: string) {
  const normalized = label.replace(/\n/g, " ").trim();
  if (!normalized) {
    return label;
  }
  if ((normalized.startsWith('"') && normalized.endsWith('"')) || (normalized.startsWith("'") && normalized.endsWith("'"))) {
    return normalized.replace(/'/g, '"');
  }
  return `"${normalized.replace(/"/g, '\\"')}"`;
}

/**
 * Sanitizes labels in flowchart/graph node and subgraph declarations.
 *
 * This utility ensures bracket/brace node labels and plain subgraph titles
 * are consistently quoted to reduce Mermaid parse failures.
 *
 * @param chart Mermaid chart source text.
 * @returns Chart source with normalized flowchart label quoting.
 */
function sanitizeFlowchartLabels(chart: string) {
  let cleaned = chart;

  cleaned = cleaned.replace(/(\b[A-Za-z0-9_]+\s*\[)([^\]\n]+)(\])/g, (_match, open, label, close) => {
    return `${open}${quoteLabelContent(label)}${close}`;
  });

  cleaned = cleaned.replace(/(\b[A-Za-z0-9_]+\s*\{)([^\}\n]+)(\})/g, (_match, open, label, close) => {
    return `${open}${quoteLabelContent(label)}${close}`;
  });

  cleaned = cleaned.replace(/^(\s*subgraph\s+)([^\[\n].*?)\s*$/gm, (_match, prefix, title) => {
    const trimmedTitle = String(title).trim();
    if (!trimmedTitle || trimmedTitle.startsWith('"') || trimmedTitle.includes('[')) {
      return `${prefix}${trimmedTitle}`;
    }
    return `${prefix}"${trimmedTitle.replace(/"/g, '\\"')}"`;
  });

  return cleaned;
}

/**
 * Cleans and normalizes Mermaid source before rendering.
 *
 * Normalization includes:
 * - Stripping optional markdown code fences.
 * - Removing an optional leading `mermaid` keyword.
 * - Forcing a newline after `graph <dir>` declarations.
 * - Removing accidental newlines inside quoted strings.
 * - Applying flowchart-specific label sanitization.
 *
 * @param chart Raw Mermaid source (possibly wrapped in markdown fences).
 * @returns Sanitized Mermaid source that is safer to render.
 */
export function sanitizeMermaidChart(chart: string) {
  let cleanChart = chart.trim();

  if (cleanChart.startsWith("```")) {
    cleanChart = cleanChart.replace(/^```(?:mermaid)?\n?/, "").replace(/\n?```$/, "");
  }

  if (cleanChart.startsWith("mermaid")) {
    cleanChart = cleanChart.replace(/^mermaid\n?/, "");
  }

  cleanChart = cleanChart.replace(/^(graph\s+(?:TD|LR|BT|RL|TB))([^\s\n])/i, "$1\n$2");
  cleanChart = cleanChart.replace(/"([^\"]*)"/g, (_match, content) => `"${String(content).replace(/\n/g, ' ')}"`);

  if (/^(?:flowchart|graph)\b/im.test(cleanChart)) {
    cleanChart = sanitizeFlowchartLabels(cleanChart);
  }

  return cleanChart;
}