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