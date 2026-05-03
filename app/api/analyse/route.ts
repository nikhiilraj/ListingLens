import { nanoid } from 'nanoid';
import { extractAsin } from '../../../lib/extract-asin';
import { redis, createRateLimiter } from '../../../lib/redis';
import { isDevMode } from '../../../lib/dev-mode';
import { getAmazonProduct } from '../../../lib/apis/serpapi';
import { getFixtureProduct } from '../../../lib/fixtures';
import { runVisualAuditor, type AgentStreamWriter } from '../../../lib/agents/visual-auditor';
import { runReviewIntelligence } from '../../../lib/agents/review-intelligence';
import { runAISearchAuditor } from '../../../lib/agents/ai-search';
import { runCategoryBenchmarker } from '../../../lib/agents/category-benchmarker';
import { runSynthesis } from '../../../lib/agents/synthesis';
import type { ProductData } from '../../../lib/schemas/product';
import type { Report } from '../../../lib/schemas/report';

export const runtime = 'edge';
export const maxDuration = 60;

interface CachedResult {
  id: string;
  asin: string;
  product: ProductData;
  report: Report | null;
}

export async function POST(request: Request): Promise<Response> {
  let body: { url?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const asin = extractAsin(body?.url ?? '');
  if (!asin) {
    return new Response(JSON.stringify({ error: 'Invalid Amazon URL' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!isDevMode()) {
    const rateLimiter = createRateLimiter(10, '1 h');
    const ip = request.headers.get('x-forwarded-for') ?? 'anonymous';
    const { success } = await rateLimiter.limit(ip);
    if (!success) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in an hour.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      const writer: AgentStreamWriter = { writeData: send };

      try {
        // First event fires immediately — Edge Runtime requires bytes within 1s
        send({ type: 'started', asin });

        if (!isDevMode()) {
          const cached = await redis.get<CachedResult>(`cache:asin:${asin}`);
          if (cached) {
            send({ type: 'product', data: cached.product });
            send({ type: 'complete', id: cached.id, cached: true });
            return;
          }
        }

        const product = isDevMode()
          ? getFixtureProduct(asin) ?? getFixtureProduct('B0CHX1W1XY')
          : await getAmazonProduct(asin);
        if (!product) {
          send({ type: 'error', message: 'Could not fetch product data for this listing.' });
          return;
        }

        send({ type: 'product', data: product });

        const [visualResult, reviewResult, searchResult, benchmarkResult] = await Promise.allSettled([
          runVisualAuditor(product, writer),
          runReviewIntelligence(product, asin, writer),
          runAISearchAuditor(product, writer),
          runCategoryBenchmarker(product, writer),
        ]);

        const visual = visualResult.status === 'fulfilled' ? visualResult.value : null;
        const review = reviewResult.status === 'fulfilled' ? reviewResult.value : null;
        const search = searchResult.status === 'fulfilled' ? searchResult.value : null;
        const benchmark = benchmarkResult.status === 'fulfilled' ? benchmarkResult.value : null;

        const report = await runSynthesis(visual, review, search, benchmark, product, writer);

        const id = nanoid();
        const resultPayload: CachedResult = { id, asin, product, report };

        if (!isDevMode()) {
          await Promise.all([
            redis.set(`result:${id}`, resultPayload, { ex: 30 * 24 * 60 * 60 }),
            redis.set(`cache:asin:${asin}`, resultPayload, { ex: 24 * 60 * 60 }),
          ]);
        }

        send({ type: 'complete', id });
      } catch {
        send({ type: 'error', message: 'Something went wrong. Please try again.' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
