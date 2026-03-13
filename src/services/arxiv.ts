import axios from 'axios';

export interface ArxivPaper {
  id: string;
  title: string;
  summary: string;
  authors: string[];
  published: string;
  link: string;
}

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
    return [];
  }
}
