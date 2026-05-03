import { generateObject, generateText } from 'ai';
import { z } from 'zod';
import { anthropic, ANTHROPIC_MODEL } from '../apis/anthropic';
import { google, GEMINI_MODEL } from '../apis/gemini';
import { AISearchSchema, type AISearch } from '../schemas/search';
import { buildGenerateQueriesPrompt, CHECK_VISIBILITY_PROMPT } from '../prompts/search-queries';
import { isDevMode } from '../dev-mode';
import { getFixtureAISearch } from '../fixtures';
import type { ProductData } from '../schemas/product';
import type { AgentStreamWriter } from './visual-auditor';

const QueriesSchema = z.object({
  questions: z.array(z.string()).length(6),
});

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

function brandVisible(response: string, brand: string): boolean {
  const r = response.toLowerCase();
  const b = brand.toLowerCase();
  if (r.includes(b)) return true;
  // Fuzzy match for short brand names — catches minor spelling variation
  if (b.length <= 8) {
    const words = r.split(/\W+/);
    return words.some(w => w.length >= 3 && levenshtein(w, b) <= 1);
  }
  return false;
}

export async function runAISearchAuditor(
  product: ProductData,
  stream: AgentStreamWriter
): Promise<AISearch | null> {
  try {
    stream.writeData({ agent: 'search', status: 'running', message: 'Generating shopper queries...' });

    if (isDevMode()) {
      await new Promise<void>(r => setTimeout(r, 600));
      stream.writeData({ agent: 'search', status: 'running', message: 'Checking visibility across Claude and Gemini...' });
      await new Promise<void>(r => setTimeout(r, 1100));
      const fixture = getFixtureAISearch();
      stream.writeData({
        agent: 'search',
        status: 'complete',
        summary: `Visibility score: ${fixture.visibilityScore}/100. ${fixture.missingKeywords.length} keyword gaps identified.`,
      });
      return fixture;
    }

    const { object: queriesObj } = await generateObject({
      model: anthropic(ANTHROPIC_MODEL),
      schema: QueriesSchema,
      system: buildGenerateQueriesPrompt(product),
      prompt: 'Generate the 6 shopper questions now.',
    });

    const brand = product.brand ?? product.title.split(' ')[0];

    stream.writeData({
      agent: 'search',
      status: 'running',
      message: `Checking visibility across Claude and Gemini for ${queriesObj.questions.length} queries...`,
    });

    const results = await Promise.all(
      queriesObj.questions.map(async (question) => {
        const [claudeRes, geminiRes] = await Promise.allSettled([
          generateText({
            model: anthropic(ANTHROPIC_MODEL),
            system: CHECK_VISIBILITY_PROMPT,
            prompt: question,
            maxOutputTokens: 300,
          }),
          generateText({
            model: google(GEMINI_MODEL),
            system: CHECK_VISIBILITY_PROMPT,
            prompt: question,
            maxOutputTokens: 300,
          }),
        ]);

        const claudeText = claudeRes.status === 'fulfilled' ? claudeRes.value.text : '';
        const geminiText = geminiRes.status === 'fulfilled' ? geminiRes.value.text : '';

        return {
          question,
          claudeFound: brandVisible(claudeText, brand),
          geminiFound: brandVisible(geminiText, brand),
        };
      })
    );

    const hits = results.reduce(
      (sum, r) => sum + (r.claudeFound ? 1 : 0) + (r.geminiFound ? 1 : 0),
      0
    );
    const visibilityScore = Math.round((hits / (results.length * 2)) * 100);
    const missingKeywords = results
      .filter(r => !r.claudeFound && !r.geminiFound)
      .map(r => r.question);

    const result: AISearch = { queries: results, visibilityScore, missingKeywords };

    stream.writeData({
      agent: 'search',
      status: 'complete',
      summary: `Visibility score: ${visibilityScore}/100. Found in ${hits} of ${results.length * 2} AI responses.`,
    });

    return result;
  } catch {
    stream.writeData({ agent: 'search', status: 'failed', message: 'AI search audit could not complete.' });
    return null;
  }
}
