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
import type { VisualAudit } from '../../../lib/schemas/visual';
import type { ReviewIntelligence } from '../../../lib/schemas/review';
import type { AISearch } from '../../../lib/schemas/search';
import type { Benchmark } from '../../../lib/schemas/benchmark';

export const runtime = 'nodejs';
// 300s gives visual audit (60–90s) + synthesis (60s) + headroom.
// On Vercel free tier (max 60s) the visual section will stream in as a
// separate event; the report itself always arrives within ~75s.
export const maxDuration = 300;

function withTimeout<T>(p: Promise<T | null>, ms: number): Promise<T | null> {
  return Promise.race([p, new Promise<null>(resolve => setTimeout(() => resolve(null), ms))]);
}

interface CachedResult {
  id: string;
  asin: string;
  product: ProductData;
  report: Report | null;
  visual: VisualAudit | null;
  review: ReviewIntelligence | null;
  search: AISearch | null;
  benchmark: Benchmark | null;
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
  console.log("Extracted ASIN:", asin, "from URL:", body?.url);
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
        send({ type: 'started', asin });

        if (!isDevMode()) {
          const cached = await redis.get<CachedResult>(`cache:v4:asin:${asin}`);
          if (cached) {
            send({ type: 'product', data: cached.product });
            send({ type: 'complete', id: cached.id, cached: true, payload: cached });
            return;
          }
        }

        console.log("Fetching product data. isDevMode:", isDevMode());
        const product = isDevMode()
          ? getFixtureProduct(asin) ?? getFixtureProduct('B0CHX1W1XY')
          : await getAmazonProduct(asin) ?? getFixtureProduct(asin);
        console.log("Product fetch result:", !!product);
        if (!product) {
          send({ type: 'error', message: 'Could not fetch product data for this listing.' });
          return;
        }

        send({ type: 'product', data: product });

        // ── Stage 1: start visual in the background immediately ──────────────
        // No withTimeout — it runs until Claude responds (typically 60–90s).
        // The client shows a skeleton loader until type:'visual_complete' arrives.
        const visualPromise = runVisualAuditor(product, writer);

        // ── Stage 2: run the three fast agents in parallel ───────────────────
        console.log("Starting fast agents in parallel (visual running in background)...");
        const [reviewResult, searchResult, benchmarkResult] = await Promise.allSettled([
          withTimeout(runReviewIntelligence(product, asin, writer), 25000),
          withTimeout(runAISearchAuditor(product, writer), 35000),
          withTimeout(runCategoryBenchmarker(product, writer), 45000),
        ]);

        const review = reviewResult.status === 'fulfilled' ? reviewResult.value : null;
        const search = searchResult.status === 'fulfilled' ? searchResult.value : null;
        const benchmark = benchmarkResult.status === 'fulfilled' ? benchmarkResult.value : null;

        // ── Stage 3: run synthesis (visual not needed for the overall report) ─
        console.log("Fast agents done. Running synthesis...");
        const report = await runSynthesis(null, review, search, benchmark, product, writer);
        console.log("Synthesis complete.");

        const id = nanoid();
        // visual is null here intentionally — it streams in separately below.
        const resultPayload: CachedResult = { id, asin, product, report, visual: null, review, search, benchmark };

        // ── Stage 4: send the report — client renders immediately ─────────────
        send({ type: 'complete', id, payload: resultPayload });

        // ── Stage 5: wait for visual (stream is still open) ──────────────────
        console.log("Awaiting visual audit result...");
        const visual = await visualPromise;
        console.log("Visual audit resolved:", visual ? `${visual.images?.length} images` : 'null');

        if (visual) {
          const fullPayload: CachedResult = { ...resultPayload, visual };
          if (!isDevMode()) {
            await Promise.all([
              redis.set(`result:${id}`, fullPayload, { ex: 30 * 24 * 60 * 60 }),
              redis.set(`cache:v4:asin:${asin}`, fullPayload, { ex: 24 * 60 * 60 }),
            ]);
          }
          // Send visual data — client hydrates the image analysis section.
          send({ type: 'visual_complete', payload: fullPayload });
        } else {
          // Visual failed — cache without it so at least the report is saved.
          if (!isDevMode()) {
            await Promise.all([
              redis.set(`result:${id}`, resultPayload, { ex: 30 * 24 * 60 * 60 }),
              redis.set(`cache:v4:asin:${asin}`, resultPayload, { ex: 24 * 60 * 60 }),
            ]);
          }
        }
      } catch (err) {
        console.error("Caught error in /api/analyse route:", err);
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
