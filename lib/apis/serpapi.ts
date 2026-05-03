import { z } from 'zod';

export const ProductDataSchema = z.object({
  title: z.string(),
  brand: z.string().optional(),
  images: z.array(z.string()),
  price: z.string().optional(),
  rating: z.number().optional(),
  review_count: z.number().optional(),
  bullet_points: z.array(z.string()),
  category: z.string().optional(),
});

export type ProductData = z.infer<typeof ProductDataSchema>;

const SEARCHAPI_BASE = 'https://www.searchapi.io/api/v1/search';

function searchApiHeaders() {
  return { Authorization: `Bearer ${process.env.SERPAPI_KEY}` };
}

export async function getAmazonProduct(asin: string): Promise<ProductData | null> {
  try {
    const url = new URL(SEARCHAPI_BASE);
    url.searchParams.set('engine', 'amazon_product');
    url.searchParams.set('asin', asin);

    const res = await fetch(url.toString(), {
      headers: searchApiHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const p = data.product;
    if (!p) return null;

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
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function searchAmazon(keyword: string, limit: number = 5): Promise<string[] | null> {
  try {
    const url = new URL(SEARCHAPI_BASE);
    url.searchParams.set('engine', 'amazon_search');
    url.searchParams.set('q', keyword);

    const res = await fetch(url.toString(), {
      headers: searchApiHeaders(),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const results: Array<{ asin?: string }> = data.organic_results ?? [];

    const asins = results
      .map((r) => r.asin)
      .filter((a): a is string => typeof a === 'string' && a.length > 0)
      .slice(0, limit);

    return asins.length > 0 ? asins : null;
  } catch {
    return null;
  }
}
