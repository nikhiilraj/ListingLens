import { z } from 'zod';

export const ReportSchema = z.object({
  overallScore: z.number(),
  grade: z.enum(['A', 'B', 'C', 'D', 'F']),
  verdict: z.string(),
  biggestLeak: z.object({
    imageIndex: z.number(),
    description: z.string(),
    prescription: z.string(),
  }),
  pixiiBrief: z.object({
    productCategory: z.string(),
    targetCustomer: z.string(),
    visualDirection: z.string(),
    heroRecommendation: z.string(),
    infographicPriorities: z.array(z.string()),
    trustSignals: z.array(z.string()),
    mobileNotes: z.string(),
    searchKeywords: z.array(z.string()),
    competitorOpening: z.string(),
  }),
});

export type Report = z.infer<typeof ReportSchema>;
