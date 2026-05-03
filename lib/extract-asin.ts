const AMAZON_HOSTS = /^(www\.)?amazon\.(com|co\.uk|co\.jp|de|fr|it|es|ca|com\.au|in|com\.br|com\.mx|nl|sg|ae|sa|se|pl|eg|tr)$/;
const ASIN_PATTERN = /\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})/i;

export function extractAsin(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  if (!AMAZON_HOSTS.test(parsed.hostname)) return null;

  const match = parsed.pathname.match(ASIN_PATTERN);
  return match ? match[1].toUpperCase() : null;
}
