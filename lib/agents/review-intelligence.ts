import { generateObject } from 'ai';
import { anthropic, ANTHROPIC_MODEL } from '../apis/anthropic';
import { ReviewIntelligenceSchema, type ReviewIntelligence } from '../schemas/review';
import { REVIEW_EXTRACTION_PROMPT } from '../prompts/review-extraction';
import { scrapeReviews } from '../apis/firecrawl';
import { isDevMode } from '../dev-mode';
import { getFixtureReviewIntelligence, getFixtureReviews } from '../fixtures';
import type { ProductData } from '../schemas/product';
import type { AgentStreamWriter } from './visual-auditor';

const UNAVAILABLE: ReviewIntelligence = {
  available: false,
  purchaseTriggers: [],
  complaints: [],
  unspokenFeatures: [],
  emotionalDrivers: [],
};

export async function runReviewIntelligence(
  product: ProductData,
  asin: string,
  stream: AgentStreamWriter
): Promise<ReviewIntelligence | null> {
  try {
    stream.writeData({ agent: 'review', status: 'running', message: 'Fetching customer reviews...' });

    if (isDevMode()) {
      await new Promise<void>(r => setTimeout(r, 800));
      stream.writeData({ agent: 'review', status: 'running', message: 'Extracting purchase triggers...' });
      await new Promise<void>(r => setTimeout(r, 1000));
      const fixture = getFixtureReviewIntelligence();
      stream.writeData({
        agent: 'review',
        status: 'complete',
        summary: `Found ${fixture.purchaseTriggers.length} purchase triggers, ${fixture.unspokenFeatures.length} unspoken features.`,
      });
      return fixture;
    }


    let reviews = await scrapeReviews(asin);

    if (!reviews || reviews.length < 5) {
      reviews = getFixtureReviews(asin);
    }

    if (!reviews || reviews.length < 5) {
      stream.writeData({
        agent: 'review',
        status: 'complete',
        summary: 'Reviews not available for this listing.',
      });
      return UNAVAILABLE;
    }

    stream.writeData({ agent: 'review', status: 'running', message: 'Extracting purchase triggers...' });

    const reviewText = reviews
      .map((r, i) => `Review ${i + 1} (${r.rating}/5): ${r.title}. ${r.text}`)
      .join('\n\n');

    const { object } = await generateObject({
      model: anthropic(ANTHROPIC_MODEL),
      schema: ReviewIntelligenceSchema,
      system: REVIEW_EXTRACTION_PROMPT,
      prompt: `Here are the customer reviews for "${product.title}" by ${product.brand ?? 'unknown brand'}:\n\n${reviewText}\n\nExtract the four categories of intelligence now.`,
    });

    stream.writeData({
      agent: 'review',
      status: 'complete',
      summary: `Found ${object.purchaseTriggers.length} purchase triggers, ${object.unspokenFeatures.length} unspoken features.`,
    });

    return object;
  } catch {
    stream.writeData({ agent: 'review', status: 'failed', message: 'Review intelligence could not complete.' });
    return null;
  }
}
