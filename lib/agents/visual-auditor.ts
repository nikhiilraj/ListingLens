import { generateObject } from 'ai';
import { anthropic, ANTHROPIC_MODEL } from '../apis/anthropic';
import { VisualAuditSchema, type VisualAudit } from '../schemas/visual';
import { buildVisualRubricPrompt } from '../prompts/visual-rubric';
import { fetchImageAsBase64 } from '../image-utils';
import { isDevMode } from '../dev-mode';
import { getFixtureVisualAudit } from '../fixtures';
import type { ProductData } from '../schemas/product';

// Minimal interface agents need from the stream — implemented by the API route in Phase 10.
export interface AgentStreamWriter {
  writeData(value: Record<string, unknown>): void;
}

export async function runVisualAuditor(
  product: ProductData,
  stream: AgentStreamWriter
): Promise<VisualAudit | null> {
  try {
    stream.writeData({ agent: 'visual', status: 'running', message: 'Loading product images...' });

    if (isDevMode()) {
      await new Promise<void>(resolve => setTimeout(resolve, 700));
      stream.writeData({ agent: 'visual', status: 'running', message: 'Sending 6 images to vision model...' });
      await new Promise<void>(resolve => setTimeout(resolve, 900));
      const fixture = getFixtureVisualAudit();
      stream.writeData({
        agent: 'visual',
        status: 'complete',
        summary: `Score: ${fixture.overallScore}/100. ${fixture.topFailures.length} critical issues identified.`,
      });
      return fixture;
    }

    const imageUrls = product.images.slice(0, 7);
    const imageResults = await Promise.allSettled(imageUrls.map(url => fetchImageAsBase64(url)));

    const validImages: { index: number; base64: string; mimeType: string }[] = [];
    imageResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        validImages.push({ index, ...result.value });
      }
    });

    stream.writeData({
      agent: 'visual',
      status: 'running',
      message: `Sending ${validImages.length} images to vision model...`,
    });

    const { object } = await generateObject({
      model: anthropic(ANTHROPIC_MODEL),
      schema: VisualAuditSchema,
      system: buildVisualRubricPrompt(product),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Audit these ${validImages.length} listing images in carousel order. Image 0 is the hero. Apply all 12 CRO levers. Every failure must meet the specificity standard in the rubric.`,
            },
            ...validImages.flatMap(({ base64, mimeType }, idx) => [
              {
                type: 'text' as const,
                text: `Image ${idx}:`,
              },
              {
                type: 'image' as const,
                image: `data:${mimeType};base64,${base64}`,
              }
            ]),
          ],
        },
      ],
    });

    const criticalCount = object.images.reduce(
      (sum, img) => sum + img.failures.filter(f => f.severity === 'critical').length,
      0
    );

    stream.writeData({
      agent: 'visual',
      status: 'complete',
      summary: `Score: ${object.overallScore}/100. Found ${criticalCount} critical failure${criticalCount !== 1 ? 's' : ''} across ${validImages.length} images.`,
    });

    return object;
  } catch (e) {
    console.error(e); stream.writeData({ agent: 'visual', status: 'failed', message: 'Visual audit could not complete.' });
    return null;
  }
}
