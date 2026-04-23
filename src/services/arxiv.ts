import axios from 'axios';

/**
 * Normalized arXiv paper metadata returned by the frontend service.
 */
export interface ArxivPaper {
  /** Canonical arXiv entry identifier URL. */
  id: string;
  /** Paper title with normalized whitespace. */
  title: string;
  /** Abstract text with normalized whitespace. */
  summary: string;
  /** Ordered list of author names from the feed. */
  authors: string[];
  /** Publication timestamp from arXiv (ISO-like string). */
  published: string;
  /** Preferred human-facing link to the paper page. */
  link: string;
}

/**
 * Converts low-level arXiv/HTTP errors into user-friendly messages.
 *
 * @param error Axios or network error object.
 * @returns Human-readable message suitable for UI display.
 */
function buildArxivErrorMessage(error: any): string {
  const status = error?.response?.status;
  const serverMessage = error?.response?.data?.error;
  const rawMessage = typeof serverMessage === 'string' && serverMessage.trim().length > 0
    ? serverMessage
    : error?.message || 'Unknown arXiv error';

  if (status === 429) {
    return 'arXiv is rate limiting requests right now. Please try again in a minute.';
  }

  if (rawMessage.includes('timeout') || error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return 'arXiv is taking too long to respond. Please retry in a moment.';
  }

  if (typeof status === 'number' && status >= 500) {
    return 'arXiv is temporarily unavailable. Please try again shortly.';
  }

  if (rawMessage && rawMessage !== 'Unknown arXiv error') {
    return rawMessage;
  }

  return 'Could not fetch papers from arXiv right now. Please try again.';
}

/**
 * Searches arXiv papers through the backend proxy endpoint and normalizes
 * the feed response into a typed list of `ArxivPaper` objects.
 *
 * @param query Free-text search query.
 * @param maxResults Maximum number of papers to return in one page.
 * @param offset Zero-based result offset for pagination.
 * @returns Promise resolving to normalized arXiv paper results.
 * @throws Error with a user-friendly message when search fails.
 */
export async function searchArxiv(query: string, maxResults: number = 20, offset: number = 0): Promise<ArxivPaper[]> {
  try {
    const response = await axios.get('/api/arxiv', {
      params: {
        search_query: `all:${query}`,
        start: offset,
        max_results: maxResults,
      },
    });

    const entries = response.data.feed.entry || [];
    return entries.map((entry: any) => ({
      id: entry.id[0],
      title: entry.title[0].replace(/\n/g, ' ').trim(),
      summary: entry.summary[0].replace(/\n/g, ' ').trim(),
      authors: (entry.author || []).map((a: any) => a.name[0]),
      published: entry.published[0],
      link: entry.link.find((l: any) => l.$.rel === 'alternate')?.$.href || entry.id[0],
    }));
  } catch (error) {
    console.error('Error searching arXiv:', error);
    throw new Error(buildArxivErrorMessage(error));
  }
}
