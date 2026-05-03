export type ReviewData = {
  title: string;
  text: string;
  rating: number;
};

export async function scrapeReviews(asin: string): Promise<ReviewData[] | null> {
  try {
    const reviewUrl = `https://www.amazon.com/product-reviews/${asin}`;

    const res = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      },
      body: JSON.stringify({
        url: reviewUrl,
        formats: ['extract'],
        extract: {
          prompt:
            'Extract all customer reviews. For each review return: title (string), text (string), rating (number 1-5).',
          schema: {
            type: 'object',
            properties: {
              reviews: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    text: { type: 'string' },
                    rating: { type: 'number' },
                  },
                  required: ['title', 'text', 'rating'],
                },
              },
            },
            required: ['reviews'],
          },
        },
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    const reviews: ReviewData[] = data.extract?.reviews ?? [];

    return reviews.length > 0 ? reviews : null;
  } catch {
    return null;
  }
}
