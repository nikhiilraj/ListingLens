import { z } from 'zod';

export const AISearchSchema = z.object({
  queries: z.array(
    z.object({
      question: z.string(),
      claudeFound: z.boolean(),
      geminiFound: z.boolean(),
    })
  ),
  visibilityScore: z.number(),
  missingKeywords: z.array(z.string()),
});

export type AISearch = z.infer<typeof AISearchSchema>;
