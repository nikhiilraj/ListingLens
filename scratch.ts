import { runVisualAuditor } from './lib/agents/visual-auditor';
import type { ProductData } from './lib/schemas/product';

async function main() {
  const product: ProductData = {
    title: "Test Product",
    images: ["https://m.media-amazon.com/images/I/71rP7f78eFL._AC_SL1500_.jpg"]
  };
  console.log("Running visual auditor...");
  const stream = { writeData: (data: any) => console.log(data.status, data.message || data.summary) };
  
  try {
    const result = await runVisualAuditor(product, stream);
    console.log("Result:", result ? "Success" : "Null");
  } catch(e) {
    console.error("Caught error:", e);
  }
}
main();
