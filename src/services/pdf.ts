import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source using Vite's asset handling
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface PdfAnalysis {
  text: string;
  wordCount: number;
  topWords: { word: string; count: number }[];
  pageCount: number;
}

export async function parsePdf(url: string): Promise<PdfAnalysis> {
  const proxyUrl = `/api/pdf?url=${encodeURIComponent(url)}`;
  const loadingTask = pdfjs.getDocument(proxyUrl);
  const pdf = await loadingTask.promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => 'str' in item ? item.str : '').join(' ');
    fullText += pageText + '\n';
  }

  // Basic analysis
  const words = fullText.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
  const freq: Record<string, number> = {};
  
  // Stop words to filter out
  const stopWords = new Set(['this', 'that', 'with', 'from', 'they', 'their', 'these', 'those', 'which', 'where', 'when', 'there', 'would', 'could', 'should', 'been', 'have', 'were', 'also', 'more', 'some', 'than', 'into', 'only', 'other', 'such', 'very', 'many']);

  words.forEach(w => {
    if (!stopWords.has(w)) {
      freq[w] = (freq[w] || 0) + 1;
    }
  });

  const topWords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([word, count]) => ({ word, count }));

  return {
    text: fullText,
    wordCount: words.length,
    topWords,
    pageCount: pdf.numPages
  };
}
