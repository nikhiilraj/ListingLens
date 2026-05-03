import type { ProductData } from '../schemas/product';

export function buildGenerateQueriesPrompt(product: ProductData): string {
  return `You are a search behaviour analyst who studies how real shoppers discover products through AI assistants like Claude and Gemini.

Your task is to generate exactly 6 questions a genuine buyer would type into an AI assistant when searching for a product in this category. The questions must reflect real purchase intent at different stages — not product research.

Product: ${product.title}
Brand: ${product.brand ?? 'Unknown'}
Category: ${product.category ?? 'Consumer product'}
Price: ${product.price ?? 'Unknown'}
Key claims: ${product.bullet_points.slice(0, 3).join(' | ')}

The 6 questions must span these intent types:
1. Direct category + outcome question ("best magnesium supplement for sleep")
2. Problem or symptom question ("natural remedy for leg cramps at night")
3. Ingredient or mechanism question ("chelated magnesium vs oxide bioavailability")
4. Lifestyle fit question ("magnesium supplement for runners")
5. Trust or credential question ("magnesium supplement recommended by doctors")
6. Brand or specification question ("TRAACS chelate magnesium absorption")

Good example: "What magnesium supplement is best for anxiety and sleep?" — specific outcome, natural phrasing, real purchase intent.
Bad example: "Tell me about magnesium supplements." — vague, no purchase intent, would not surface brands in a real response.

The questions must be realistic shopper language, not technical research queries.`;
}

export const CHECK_VISIBILITY_PROMPT = `You are a helpful shopping assistant. When a shopper asks about a product category, recommend exactly 5 specific products by name. Always include both the brand name and product name. Write in natural prose — one paragraph of genuine recommendations. Name real brands that real shoppers would recognise.`;
