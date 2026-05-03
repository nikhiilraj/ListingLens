import { generateObject } from 'ai';
import { anthropic, ANTHROPIC_MODEL } from '../apis/anthropic';
import { ReportSchema, type Report } from '../schemas/report';
import { SYNTHESIS_PROMPT } from '../prompts/synthesis';
import { isDevMode } from '../dev-mode';
import { getFixtureReport } from '../fixtures';
import type { ProductData } from '../schemas/product';
import type { VisualAudit } from '../schemas/visual';
import type { ReviewIntelligence } from '../schemas/review';
import type { AISearch } from '../schemas/search';
import type { Benchmark } from '../schemas/benchmark';
import type { AgentStreamWriter } from './visual-auditor';

export async function runSynthesis(
  visual: VisualAudit | null,
  review: ReviewIntelligence | null,
  search: AISearch | null,
  benchmark: Benchmark | null,
  product: ProductData,
  stream: AgentStreamWriter
): Promise<Report | null> {
  try {
    stream.writeData({ agent: 'synthesis', status: 'running', message: 'Cross-referencing findings across all agents...' });

    if (isDevMode()) {
      await new Promise<void>(r => setTimeout(r, 900));
      stream.writeData({ agent: 'synthesis', status: 'running', message: 'Generating your Pixii brief...' });
      await new Promise<void>(r => setTimeout(r, 1100));
      const fixture = getFixtureReport();
      stream.writeData({
        agent: 'synthesis',
        status: 'complete',
        summary: `Overall score: ${fixture.overallScore}/100 (${fixture.grade}). Pixii brief ready.`,
      });
      return fixture;
    }

    const agentOutputs: Record<string, unknown> = {
      product: {
        title: product.title,
        brand: product.brand,
        price: product.price,
        rating: product.rating,
        reviewCount: product.review_count,
        category: product.category,
        bulletPoints: product.bullet_points,
      },
    };

    if (visual) agentOutputs.visual_audit = visual;
    if (review && review.available) agentOutputs.review_intelligence = review;
    if (search) agentOutputs.ai_search = search;
    if (benchmark) agentOutputs.benchmark = benchmark;

    const availableAgents = [
      visual ? 'visual_audit (50% weight)' : null,
      review?.available ? 'review_intelligence (20% weight)' : null,
      search ? 'ai_search (15% weight)' : null,
      benchmark ? 'benchmark (15% weight)' : null,
    ]
      .filter(Boolean)
      .join(', ');

    stream.writeData({ agent: 'synthesis', status: 'running', message: 'Generating your Pixii brief...' });

    const { object } = await generateObject({
      model: anthropic(ANTHROPIC_MODEL),
      schema: ReportSchema,
      system: SYNTHESIS_PROMPT,
      prompt: `Here are the agent outputs for this Amazon listing. Available agents: ${availableAgents}.\n\n${JSON.stringify(agentOutputs, null, 2)}\n\nSynthesise these findings into a report and Pixii brief now.`,
    });

    stream.writeData({
      agent: 'synthesis',
      status: 'complete',
      summary: `Overall score: ${object.overallScore}/100 (${object.grade}). Pixii brief ready.`,
    });

    return object;
  } catch {
    stream.writeData({ agent: 'synthesis', status: 'failed', message: 'Synthesis could not complete.' });
    return null;
  }
}
