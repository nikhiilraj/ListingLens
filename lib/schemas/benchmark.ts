import { z } from 'zod';

export const BenchmarkSchema = z.object({
  competitorCount: z.number(),
  visualStrategies: z.array(
    z.object({
      asin: z.string(),
      thumbnailUrl: z.string().optional(),
      strategy: z.string(),
      hookLine: z.string(),
    })
  ),
  gapAnalysis: z.string(),
  opening: z.string(),
});

export type Benchmark = z.infer<typeof BenchmarkSchema>;
