import { runReviewIntelligence } from '../lib/agents/review-intelligence';
import { getFixtureProduct } from '../lib/fixtures';

async function main() {
  const product = getFixtureProduct('B0CHX1W1XY');
  if (!product) { console.error('no fixture'); process.exit(1); }

  const stream = {
    writeData(v: Record<string, unknown>) { console.log(JSON.stringify(v)); }
  };

  const start = Date.now();
  const result = await runReviewIntelligence(product, 'B0CHX1W1XY', stream);
  const ms = Date.now() - start;

  console.log('ms:', ms);
  console.log('purchaseTriggers:', result?.purchaseTriggers.length);
  console.log('unspokenFeatures:', result?.unspokenFeatures.length);
  console.log('available:', result?.available);
}

main();
