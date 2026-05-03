import { z } from 'zod';

export const ProductDataSchema = z.object({
  title: z.string(),
  brand: z.string().optional(),
  images: z.array(z.string()),
  price: z.string().optional(),
  rating: z.number().optional(),
  review_count: z.number().optional(),
  bullet_points: z.array(z.string()),
  category: z.string().optional(),
});

export type ProductData = z.infer<typeof ProductDataSchema>;
