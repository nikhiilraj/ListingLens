import { z } from 'zod';

const FailureSchema = z.object({
  lever: z.string(),
  severity: z.enum(['critical', 'major', 'minor']),
  description: z.string(),
  fix: z.string(),
});

const ImageAuditSchema = z.object({
  index: z.number(),
  score: z.number(),
  failures: z.array(FailureSchema),
});

export const VisualAuditSchema = z.object({
  overallScore: z.number(),
  verdict: z.string(),
  images: z.array(ImageAuditSchema),
  topFailures: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      fix: z.string(),
    })
  ),
});

export type VisualAudit = z.infer<typeof VisualAuditSchema>;
