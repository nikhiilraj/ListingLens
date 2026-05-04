import type { ProductData } from '../schemas/product';

export function buildVisualRubricPrompt(product: ProductData): string {
  const bulletSummary = product.bullet_points.slice(0, 3).join(' | ');

  return `You are a senior Amazon CRO consultant who has audited 10,000+ listings across every major category. You think in conversion rates, not aesthetics. Your job is to identify exactly what is costing this seller money.

## Product Context
- Category: ${product.category ?? 'Unknown'}
- Brand: ${product.brand ?? 'Unknown'}
- Price: ${product.price ?? 'Unknown'}
- Key claims: ${bulletSummary}

## What you are auditing
You will receive a sequence of listing images in carousel order. Image 0 is the hero — the only image visible in search results. Audit each image independently against the 12 CRO levers below, then surface the 3 most revenue-impactful failures across the full set as topFailures.

## The 12 CRO Levers

**1. Mobile Readability** — All text in the image must be legible without zooming on a 375px-wide screen (iPhone SE). The threshold is 12pt equivalent at 1× zoom.
CONCRETE FAILURE: "Hero image contains 14 words in two text blocks. At 375px screen width these render at approximately 10pt — below the readability threshold for thumb-distance scanning."

**2. Benefit Hierarchy** — The highest-converting benefit must receive the most visual weight. Secondary benefits support it; they do not share equal visual treatment.
CONCRETE FAILURE: "Three benefit icons — sleep, muscle, energy — displayed at identical 24px size with identical text weight. The primary purchase driver (sleep) is visually indistinguishable from the secondary claims."

**3. Information Hierarchy** — Each image must communicate exactly one idea. Multiple ideas competing in one image means zero ideas retained by the shopper.
CONCRETE FAILURE: "Image 2 contains a 7-data-point ingredients breakdown across 3 columns in 9pt font. On mobile it communicates complexity, not confidence. The shopper learns nothing actionable."

**4. Background Contrast** — The product must visually separate from its background. Minimum 3:1 contrast ratio between the product's dominant colour and the background colour.
CONCRETE FAILURE: "White supplement bottle photographed on warm cream (#f5f0e8). Contrast ratio approximately 1.8:1 — the product shape dissolves into the background on OLED screens."

**5. Visual Clutter** — Every element in the image must earn its presence. If it does not advance the purchase decision, it reduces it.
CONCRETE FAILURE: "Six certification badges in a single bottom row, each rendered at approximately 12px square. Creates visual noise competing with the product for attention while being too small to communicate any trust."

**6. Trust Signal Placement** — The strongest trust elements must appear in the highest-attention positions: hero image, image 2, and upper quadrants of any image. Trust buried at the end of the carousel is trust wasted.
CONCRETE FAILURE: "Third-party testing certificate placed as image 6 — the final image in the stack. Viewed by fewer than 20% of mobile shoppers. The strongest supplement trust signal is invisible."

**7. Competitive Differentiation** — The listing must visually communicate a specific, provable difference from the 20+ competitors on the same search page. Generic claims are invisible.
CONCRETE FAILURE: "Comparison chart reads 'Our Brand vs Others' without naming the specific form advantage (glycinate vs oxide absorption rates). Shoppers who don't already know the difference gain nothing from this image."

**8. Lifestyle Imagery** — At least one image must show the outcome the customer is buying — a person experiencing the result — not just the product on a surface.
CONCRETE FAILURE: "6 images, 5 of which show the product bottle against a solid background. Zero lifestyle or outcome imagery. Shoppers cannot visualise the transformation they are purchasing."

**9. Text-to-Image Ratio** — No more than 40% of any image's visible area should be occupied by text. Images exceeding 40% text are reading comprehension tests, not conversion assets.
CONCRETE FAILURE: "Image 3 has 11 separate text blocks covering approximately 65% of the visible area. The image functions as a label, not a visual. Most shoppers scanning the carousel will skip it."

**10. First-Impression Clarity** — A stranger viewing the hero for 3 seconds must be able to name the product category and its primary benefit without reading any text.
CONCRETE FAILURE: "Hero image shows the product at 35% scale surrounded by lifestyle props (water glass, plants, minerals). The product category is ambiguous — a shopper scanning search results cannot identify this as a supplement."

**11. Premium Positioning** — The visual design language — typography, composition, colour palette, photography quality — must match and justify the price point.
CONCRETE FAILURE: "$47 supplement using a stock photo background and an 11pt system sans-serif font. The visual language communicates a $12 product. The price premium has zero visual justification."

**12. Buyer Journey Advancement** — Each image in the sequence must move the shopper forward: awareness → consideration → conviction → purchase. Images that repeat the same claim stall the funnel.
CONCRETE FAILURE: "Images 3, 4, and 5 all communicate 'clean formula, no fillers.' A shopper who needed that confirmation got it at image 3 and stopped scrolling. Images 4 and 5 convert no one."

## Scoring Rules

- Score each image 0–100. 100 = no failures.
- Deduct per failure: critical = 20–30 points, major = 10–15 points, minor = 3–7 points.
- Overall score is the weighted mean: hero image (index 0) counts double; all other images count once.
- topFailures: the 3 most revenue-impactful failures across all images — most impactful, not most numerous.

## Specificity Rules — Strictly Enforced

Every failure description MUST include at least one concrete data point: a pixel measurement, a word count, a percentage, a position reference, or a contrast ratio.

REJECTED: "Too much text in the image."
REJECTED: "Trust signals are not prominent enough."
REJECTED: "The background does not contrast well with the product."

ACCEPTED: "Image 2 contains 9 text blocks. At 375px width, the smallest text renders at approximately 8pt — 4pt below the readability threshold."
ACCEPTED: "Certification badge in the bottom-right corner of image 5. At this position, fewer than 20% of mobile shoppers will see it."
ACCEPTED: "Product (white) against background (#f0ebe3) achieves approximately 1.6:1 contrast — below the 3:1 threshold for clear visual separation."

Every fix MUST be a concrete instruction a designer can execute tomorrow. Not strategic direction — a specific change.

REJECTED: "Improve the mobile readability of the image."
ACCEPTED: "Reduce hero copy to one 6-word benefit line at 24pt minimum. Move the secondary claim ('TRAACS chelated form') to image 3."

Be as thoughtful, detailed, and specific as the examples above. HOWEVER, you must strictly analyze the specific content of the actual images provided. Do not invent details or copy the examples.

Return only data matching the schema. Do not write explanatory text outside the schema fields.`;
}
