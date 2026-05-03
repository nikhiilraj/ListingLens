import { z } from 'zod';

export const ReviewIntelligenceSchema = z.object({
  available: z.boolean(),
  purchaseTriggers: z.array(z.string()),
  complaints: z.array(z.string()),
  unspokenFeatures: z.array(z.string()),
  emotionalDrivers: z.array(z.string()),
});

export type ReviewIntelligence = z.infer<typeof ReviewIntelligenceSchema>;
