import { getAmazonProduct, searchAmazon } from '../lib/apis/serpapi';

async function main() {
  const ASIN = 'B0DT1JKGPH';

  process.stdout.write('getAmazonProduct... ');
  const product = await getAmazonProduct(ASIN);
  if (product) {
    console.log('OK');
    console.log('  title:', product.title);
    console.log('  brand:', product.brand);
    console.log('  price:', product.price);
    console.log('  rating:', product.rating);
    console.log('  review_count:', product.review_count);
    console.log('  images:', product.images.length, 'found');
    console.log('  bullet_points:', product.bullet_points.length, 'found');
  } else {
    console.log('FAILED — returned null');
  }

  process.stdout.write('\nsearchAmazon("magnesium glycinate", 5)... ');
  const competitors = await searchAmazon('magnesium glycinate', 5);
  if (competitors) {
    console.log('OK');
    console.log('  ASINs:', competitors);
  } else {
    console.log('FAILED — returned null');
  }
}

main();
