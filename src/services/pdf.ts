import * as pdfjs from 'pdfjs-dist';
// @ts-ignore
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

// Set worker source using Vite's asset handling
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Normalized PDF analysis payload consumed by Deep Dive visualizations.
 */
export interface PdfAnalysis {
  /** Full extracted text content across all pages. */
  text: string;
  /** Count of tokenized words matching the analysis regex. */
  wordCount: number;
  /** Top keyword frequencies after stop-word filtering. */
  topWords: { word: string; count: number }[];
  /** Number of pages in the parsed PDF document. */
  pageCount: number;
}

/**
 * Fetches and parses a PDF via the backend proxy, then computes a lightweight
 * lexical summary used by the Deep Dive tab.
 *
 * Processing steps:
 * 1. Route the input URL through `/api/pdf` to avoid CORS issues.
 * 2. Extract text from each page using `pdfjs-dist`.
 * 3. Tokenize words, filter stop words, and calculate top frequencies.
 *
 * @param url Absolute PDF URL (for example an arXiv PDF link).
 * @returns A normalized `PdfAnalysis` object containing extracted text,
 *          word counts, ranked keywords, and page count.
 * @throws Propagates errors from network fetch or PDF parsing.
 */
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
