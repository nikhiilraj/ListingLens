import type { ProductData } from '../schemas/product';

export function buildBenchmarkPrompt(product: ProductData): string {
  return `You are a senior Amazon visual strategist who has analysed visual strategies across 50,000+ product listings.

You will be shown a sequence of hero images. Image 0 is the product under review. Images 1–N are direct category competitors.

Your task:

1. For each competitor image (1–N), classify their visual strategy in 1–2 concrete, specific sentences. Name the specific tactic and why it converts, not a vague label. Include the single hook the image communicates.

2. Write a gap analysis — 2–3 sentences identifying what visual territory none of the competitors are currently occupying and why that represents a conversion opportunity.

3. Write the opening — 2–3 sentences describing the specific, actionable visual opportunity the product under review should own.

Product under review: ${product.title}
Brand: ${product.brand ?? 'Unknown'}
Category: ${product.category ?? 'Consumer product'}

Sharp strategy description (accepted): "Clinical authority — white background, oversized certificate badges, lab coat imagery. Communicates pharmaceutical-grade trust without making a claim. Every image contains one credential and one benefit — zero visual noise."

Vague strategy description (rejected): "Uses a clean, professional visual style to communicate quality and trust."

The hookLine for each competitor must be a single punchy sentence that captures their core conversion argument — what they are telling the shopper to feel or believe.

Image 0 is the product under review. Every competitor image has been provided in the message with its ASIN — use those ASINs exactly.`;
}
