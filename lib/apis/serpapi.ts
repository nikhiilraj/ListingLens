import { ProductDataSchema, type ProductData } from '../schemas/product';
export { ProductDataSchema, type ProductData };

const SEARCHAPI_BASE = 'https://www.searchapi.io/api/v1/search';

function searchApiHeaders() {
  return { Authorization: `Bearer ${process.env.SERPAPI_KEY}` };
}

function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), ms);
  return fetch(url, { headers: searchApiHeaders(), signal: controller.signal })
    .finally(() => clearTimeout(tid));
}

export async function getAmazonProduct(asin: string): Promise<ProductData | null> {
  try {
    const url = new URL(SEARCHAPI_BASE);
    url.searchParams.set('engine', 'amazon_product');
    url.searchParams.set('asin', asin);

    const res = await fetchWithTimeout(url.toString(), 15000);
    if (!res.ok) return null;

    const data = await res.json();
    const p = data.product;
    if (!p) return await getAmazonProductFallback(asin);

    const raw = {
      title: p.title ?? '',
      brand: p.brand_store?.text
        ? p.brand_store.text.replace(/^Visit the\s+/i, '').replace(/\s+Store$/i, '').trim()
        : undefined,
      images: Array.isArray(p.images)
        ? p.images.map((img: { link?: string }) => img.link ?? '').filter(Boolean)
        : [],
      price: p.buybox?.price?.raw ?? undefined,
      rating: typeof p.rating === 'number' ? p.rating : undefined,
      review_count: typeof p.reviews === 'number' ? p.reviews : undefined,
      bullet_points: Array.isArray(p.feature_bullets) ? p.feature_bullets : [],
      category: p.search_alias?.title ?? undefined,
    };

    const parsed = ProductDataSchema.safeParse(raw);
    return parsed.success ? parsed.data : await getAmazonProductFallback(asin);
  } catch {
    return getAmazonProductFallback(asin);
  }
}

async function getAmazonProductFallback(asin: string): Promise<ProductData | null> {
  try {
    const url = new URL(SEARCHAPI_BASE);
    url.searchParams.set('engine', 'amazon_search');
    url.searchParams.set('q', asin);

    const res = await fetchWithTimeout(url.toString(), 15000);
    if (!res.ok) return null;

    const data = await res.json();
    const results: Array<{ asin?: string; thumbnail?: string; title?: string; price?: string; rating?: number; reviews?: number }> =
      data.organic_results ?? [];

    const match = results.find(r => r.asin === asin) ?? results[0];
    if (!match || !match.title) return null;

    const raw = {
      title: match.title,
      images: match.thumbnail ? [match.thumbnail] : [],
      price: match.price ?? undefined,
      rating: typeof match.rating === 'number' ? match.rating : undefined,
      review_count: typeof match.reviews === 'number' ? match.reviews : undefined,
      bullet_points: [],
    };

    const parsed = ProductDataSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function searchAmazon(keyword: string, limit: number = 5): Promise<string[] | null> {
  const results = await searchAmazonRich(keyword, limit);
  if (!results) return null;
  return results.map(r => r.asin);
}

export interface SearchResult {
  asin: string;
  thumbnail: string;
  title: string;
}

export async function searchAmazonRich(keyword: string, limit: number = 5): Promise<SearchResult[] | null> {
  try {
    const url = new URL(SEARCHAPI_BASE);
    url.searchParams.set('engine', 'amazon_search');
    url.searchParams.set('q', keyword);

    const res = await fetchWithTimeout(url.toString(), 15000);
    if (!res.ok) return null;

    const data = await res.json();
    const results: Array<{ asin?: string; thumbnail?: string; title?: string }> = data.organic_results ?? [];

    const items = results
      .filter(r => r.asin && r.thumbnail)
      .slice(0, limit)
      .map(r => ({
        asin: r.asin!,
        thumbnail: r.thumbnail!,
        title: r.title ?? '',
      }));

    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}
