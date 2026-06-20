import { XMLParser } from 'fast-xml-parser';

export interface NewsHeadline {
  title: string;
  source: string;
}

interface InternalHeadline extends NewsHeadline {
  publishedAt: Date;
}

const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: true });

async function fetchRSS(url: string, defaultSource: string): Promise<InternalHeadline[]> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DeskThing/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const xml = await response.text();
    const parsed = parser.parse(xml);
    const items = parsed?.rss?.channel?.item ?? [];
    const itemArray: any[] = Array.isArray(items) ? items : [items];

    return itemArray
      .map((item): InternalHeadline | null => {
        let title = String(item.title ?? '').trim();
        if (!title) return null;

        let source = defaultSource;

        // Google News titles: "Article title - Source Name"
        if (defaultSource === 'Google News') {
          const match = title.match(/^(.*)\s+-\s+([^-]+)$/);
          if (match) {
            title = match[1].trim();
            source = match[2].trim();
          }
        }

        return {
          title,
          source,
          publishedAt: new Date(item.pubDate ?? item['dc:date'] ?? 0),
        };
      })
      .filter((h): h is InternalHeadline => h !== null);
  } catch (err) {
    console.warn(`[news] Failed to fetch ${defaultSource}:`, (err as Error).message);
    return [];
  }
}

async function fetchNewsAPI(apiKey: string): Promise<InternalHeadline[]> {
  if (!apiKey.trim()) return [];

  try {
    const url = `https://newsapi.org/v2/everything?q=Schenectady+NY&language=en&pageSize=15&sortBy=publishedAt&apiKey=${apiKey}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = (await response.json()) as any;
    if (data.status !== 'ok') throw new Error(data.message ?? 'API error');

    return (data.articles ?? [])
      .filter((a: any) => a.title && a.title !== '[Removed]')
      .map((a: any): InternalHeadline => ({
        title: String(a.title).trim(),
        source: String(a.source?.name ?? 'NewsAPI').trim(),
        publishedAt: new Date(a.publishedAt ?? 0),
      }));
  } catch (err) {
    console.warn(`[news] NewsAPI failed:`, (err as Error).message);
    return [];
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchHeadlines(newsApiKey = ''): Promise<NewsHeadline[]> {
  const [gazette, google, newsapi] = await Promise.allSettled([
    fetchRSS('https://dailygazette.com/feed/', 'Daily Gazette'),
    fetchRSS(
      'https://news.google.com/rss/search?q=Schenectady+NY&hl=en-US&gl=US&ceid=US:en',
      'Google News'
    ),
    fetchNewsAPI(newsApiKey),
  ]);

  const all: InternalHeadline[] = [
    ...(gazette.status === 'fulfilled' ? gazette.value : []),
    ...(google.status === 'fulfilled' ? google.value : []),
    ...(newsapi.status === 'fulfilled' ? newsapi.value : []),
  ];

  const seen = new Set<string>();
  const deduped = all.filter((h) => {
    const key = normalizeTitle(h.title);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped
    .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
    .slice(0, 10)
    .map(({ title, source }) => ({ title, source }));
}
