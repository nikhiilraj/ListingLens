import { runSynthesis } from '../lib/agents/synthesis';
import {
  getFixtureVisualAudit,
  getFixtureReviewIntelligence,
  getFixtureAISearch,
  getFixtureBenchmark,
  getFixtureProduct,
} from '../lib/fixtures';

async function main() {
  const product = getFixtureProduct('B0CHX1W1XY')!;
  const visual = getFixtureVisualAudit();
  const review = getFixtureReviewIntelligence();
  const search = getFixtureAISearch();
  const benchmark = getFixtureBenchmark();
  const stream = { writeData: (d: Record<string, unknown>) => process.stdout.write(JSON.stringify(d) + '\n') };

  const start = Date.now();
  const result = await runSynthesis(visual, review, search, benchmark, product, stream);
  const elapsed = Date.now() - start;

  process.stdout.write('elapsed: ' + elapsed + 'ms\n');
  process.stdout.write('score: ' + result?.overallScore + '\n');
  process.stdout.write('grade: ' + result?.grade + '\n');
  process.stdout.write('verdict length: ' + (result?.verdict?.length ?? 0) + '\n');
  process.stdout.write('pixii brief keys: ' + (result?.pixiiBrief ? Object.keys(result.pixiiBrief).length : 0) + '\n');
}

main();
