import { getFixtureProduct } from './lib/fixtures';
import { runVisualAuditor } from './lib/agents/visual-auditor';

async function main() {
  const product = getFixtureProduct('B0CHX1W1XY');
  if (!product) throw new Error("no fixture");
  
  const stream = { writeData: (d: any) => console.log(d) };
  try {
    const result = await runVisualAuditor(product, stream);
    console.log("Result:", result ? "success" : "null");
  } catch(e) {
    console.error("Test caught:", e);
  }
}
main();
