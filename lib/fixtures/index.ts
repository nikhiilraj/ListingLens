import type { ProductData } from '../schemas/product';
import type { VisualAudit } from '../schemas/visual';
import type { ReviewIntelligence } from '../schemas/review';
import type { AISearch } from '../schemas/search';
import type { Benchmark } from '../schemas/benchmark';
import type { Report } from '../schemas/report';
import type { ReviewData } from '../apis/firecrawl';

import B0CHX1W1XY_product from './products/B0CHX1W1XY.json';
import B07WF4XN1S_product from './products/B07WF4XN1S.json';
import B08N5WRWNW_product from './products/B08N5WRWNW.json';

import B0CHX1W1XY_reviews from './reviews/B0CHX1W1XY.json';
import B07WF4XN1S_reviews from './reviews/B07WF4XN1S.json';
import B08N5WRWNW_reviews from './reviews/B08N5WRWNW.json';

import _visualAudit from './visual-audit.json';
import _reviewIntelligence from './review-intelligence.json';
import _aiSearch from './ai-search.json';
import _benchmark from './benchmark.json';
import _report from './report.json';

const products: Record<string, ProductData> = {
  B0CHX1W1XY: B0CHX1W1XY_product as ProductData,
  B07WF4XN1S: B07WF4XN1S_product as ProductData,
  B08N5WRWNW: B08N5WRWNW_product as ProductData,
};

const reviews: Record<string, ReviewData[]> = {
  B0CHX1W1XY: B0CHX1W1XY_reviews as ReviewData[],
  B07WF4XN1S: B07WF4XN1S_reviews as ReviewData[],
  B08N5WRWNW: B08N5WRWNW_reviews as ReviewData[],
};

export function getFixtureProduct(asin: string): ProductData | null {
  return products[asin] ?? null;
}

export function getFixtureReviews(asin: string): ReviewData[] | null {
  return reviews[asin] ?? null;
}

export function getFixtureVisualAudit(): VisualAudit {
  return _visualAudit as VisualAudit;
}

export function getFixtureReviewIntelligence(): ReviewIntelligence {
  return _reviewIntelligence as ReviewIntelligence;
}

export function getFixtureAISearch(): AISearch {
  return _aiSearch as AISearch;
}

export function getFixtureBenchmark(): Benchmark {
  return _benchmark as Benchmark;
}

export function getFixtureReport(): Report {
  return _report as Report;
}
