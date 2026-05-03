import { generateObject } from 'ai';
import { z } from 'zod';
import { anthropic, ANTHROPIC_MODEL } from '../apis/anthropic';
import { BenchmarkSchema, type Benchmark } from '../schemas/benchmark';
import { buildBenchmarkPrompt } from '../prompts/benchmark';
import { getAmazonProduct, searchAmazon } from '../apis/serpapi';
import { fetchImageAsBase64 } from '../image-utils';
import { isDevMode } from '../dev-mode';
import { getFixtureBenchmark } from '../fixtures';
import type { ProductData } from '../schemas/product';
import type { AgentStreamWriter } from './visual-auditor';

async function extractKeyword(title: string): Promise<string> {
  const { object } = await generateObject({
    model: anthropic(ANTHROPIC_MODEL),
    schema: z.object({ keyword: z.string() }),
    prompt: `Extract the primary 2-3 word Amazon search keyword from this product title. Return only the keyword phrase — no explanation.\n\nTitle: ${title}`,
  });
  return object.keyword;
}

export async function runCategoryBenchmarker(
  product: ProductData,
  stream: AgentStreamWriter
): Promise<Benchmark | null> {
  try {
    stream.writeData({ agent: 'benchmark', status: 'running', message: 'Identifying category competitors...' });

    if (isDevMode()) {
      await new Promise<void>(r => setTimeout(r, 800));
      stream.writeData({ agent: 'benchmark', status: 'running', message: 'Fetching competitor hero images...' });
      await new Promise<void>(r => setTimeout(r, 1200));
      const fixture = getFixtureBenchmark();
      stream.writeData({
        agent: 'benchmark',
        status: 'complete',
        summary: `Benchmarked against ${fixture.competitorCount} competitors. Gap identified.`,
      });
      return fixture;
    }

    const keyword = await extractKeyword(product.title);

    stream.writeData({
      agent: 'benchmark',
      status: 'running',
      message: `Searching "${keyword}" for top competitors...`,
    });

    const competitorAsins = await searchAmazon(keyword, 5);
    if (!competitorAsins || competitorAsins.length === 0) {
      stream.writeData({ agent: 'benchmark', status: 'failed', message: 'No category competitors found.' });
      return null;
    }

    const competitorResults = await Promise.allSettled(
      competitorAsins.map(asin => getAmazonProduct(asin))
    );

    const validCompetitors = competitorResults
      .map((r, i) => ({
        asin: competitorAsins[i],
        product: r.status === 'fulfilled' ? r.value : null,
      }))
      .filter((c): c is { asin: string; product: ProductData } => c.product !== null);

    stream.writeData({
      agent: 'benchmark',
      status: 'running',
      message: `Fetching hero images for ${validCompetitors.length} competitors...`,
    });

    const [userHeroResult, ...competitorHeroResults] = await Promise.allSettled([
      fetchImageAsBase64(product.images[0]),
      ...validCompetitors.map(c => fetchImageAsBase64(c.product.images[0])),
    ]);

    if (userHeroResult.status === 'rejected') {
      stream.writeData({ agent: 'benchmark', status: 'failed', message: 'Could not load product hero image.' });
      return null;
    }

    const validCompetitorImages = validCompetitors
      .map((c, i) => ({
        asin: c.asin,
        result: competitorHeroResults[i],
      }))
      .filter((c): c is { asin: string; result: PromiseFulfilledResult<{ base64: string; mimeType: string }> } =>
        c.result.status === 'fulfilled'
      )
      .map(c => ({ asin: c.asin, ...c.result.value }));

    if (validCompetitorImages.length === 0) {
      stream.writeData({ agent: 'benchmark', status: 'failed', message: 'Could not load any competitor images.' });
      return null;
    }

    stream.writeData({
      agent: 'benchmark',
      status: 'running',
      message: `Analysing visual strategies across ${validCompetitorImages.length + 1} listings...`,
    });

    const competitorLines = validCompetitorImages
      .map((c, i) => `Image ${i + 1}: competitor ASIN ${c.asin}`)
      .join('\n');

    const { object } = await generateObject({
      model: anthropic(ANTHROPIC_MODEL),
      schema: BenchmarkSchema,
      system: buildBenchmarkPrompt(product),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Image 0 is the product under review (${product.brand ?? product.title}).\n${competitorLines}\n\nClassify each competitor's visual strategy and identify the market gap. Use the exact ASINs listed above.`,
            },
            {
              type: 'image',
              image: `data:${userHeroResult.value.mimeType};base64,${userHeroResult.value.base64}`,
            },
            ...validCompetitorImages.map(({ base64, mimeType }) => ({
              type: 'image' as const,
              image: `data:${mimeType};base64,${base64}`,
            })),
          ],
        },
      ],
    });

    const result: Benchmark = {
      ...object,
      competitorCount: validCompetitorImages.length,
      visualStrategies: object.visualStrategies.map((s, i) => ({
        ...s,
        asin: validCompetitorImages[i]?.asin ?? s.asin,
      })),
    };

    stream.writeData({
      agent: 'benchmark',
      status: 'complete',
      summary: `Benchmarked against ${validCompetitorImages.length} competitors. ${result.opening.slice(0, 80)}...`,
    });

    return result;
  } catch {
    stream.writeData({ agent: 'benchmark', status: 'failed', message: 'Category benchmark could not complete.' });
    return null;
  }
}
