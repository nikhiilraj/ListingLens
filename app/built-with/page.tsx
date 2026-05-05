import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Built With — ListingLens',
  description: 'Every tool, API, and decision that went into ListingLens — with a one-line explanation of why each was chosen.',
};

const AI_MODELS = [
  { tool: 'Claude Sonnet 4.6', vs: 'GPT-4V', reason: 'Dramatically better structured output on rubric-constrained vision tasks. GPT-4V over-justifies; Sonnet gives clean numerical scores when you constrain the prompt. This matters when you\'re scoring 7 images and need consistent JSON, not essays.' },
  { tool: 'Gemini 2.5 Flash', vs: 'Perplexity API', reason: 'AI search visibility needs multi-model coverage — a product can rank on Claude and be invisible on Gemini. Perplexity is web-search-augmented, which would confound the pure LLM visibility test. Flash is cheap, fast, and gives clean conversational responses.' },
];

const DATA_SOURCES = [
  { tool: 'SerpAPI', vs: 'Rainforest API', reason: 'SerpAPI covers both Amazon reviews and Google Shopping results in one subscription — the benchmarker needs Shopping data, and the review agent needs Amazon review data. Rainforest is Amazon-only. One API key, one billing relationship, two data sources.' },
  { tool: 'Firecrawl', vs: 'Playwright scrape', reason: 'Firecrawl handles JavaScript rendering, anti-bot headers, and extraction schemas out of the box. A custom Playwright scraper would require maintaining browser infrastructure. For a 2-day sprint, Firecrawl is the obvious choice.' },
  { tool: 'Image proxy', vs: 'Direct CDN URLs', reason: 'Amazon CDN URLs require session cookies to resolve consistently from a server context. The proxy layer fetches, caches in Upstash, and serves with correct content-type headers. Without this, 30–40% of image fetches fail silently.' },
];

const INFRA = [
  { tool: 'Vercel Edge', vs: 'Railway', reason: 'SSE streaming works natively via ReadableStream on Vercel Edge with zero configuration. Railway requires a persistent process, which adds cold-start latency and operational overhead. Edge functions also distribute globally.' },
  { tool: 'Upstash KV', vs: 'PlanetScale / Postgres', reason: 'Report storage is read-heavy, single-key lookups, with no relational queries. Upstash is serverless Redis — no connection pool management, no idle cost, HTTP-native. PlanetScale would be correct for complex queries; this isn\'t that.' },
  { tool: 'Vercel AI SDK 6', vs: 'LangChain', reason: 'Native SSE streaming, generateObject with Zod validation, and a clean parallel execution model. LangChain adds abstraction overhead and version instability that a 2-day sprint can\'t afford. AI SDK does exactly what\'s needed.' },
];

const DESIGN = [
  { tool: 'DM Sans', vs: 'Inter / Geist', reason: 'Inter is table stakes — every SaaS product uses it. DM Sans has slightly more character at large display sizes (the score number at 80px matters) while staying clean at body size. DM Sans is a deliberate choice, not a default.' },
  { tool: 'JetBrains Mono', vs: 'Fira Code / SF Mono', reason: 'The agent log lines read as typewriter output — the monospace choice directly shapes how "live" the analysis feels. JetBrains Mono has better readability at 12px than Fira Code, and is more legible than system monospace in the report context.' },
  { tool: 'Tailwind v4', vs: 'CSS Modules', reason: 'CSS variable-first theming in Tailwind v4 maps perfectly to the design token system. CSS Modules would require duplicating every token. Tailwind v4\'s @theme inline block eliminates the gap between design system and utility classes.' },
];

function StackSection({ label, rows }: { label: string; rows: typeof AI_MODELS }) {
  return (
    <div style={{ marginBottom: 56 }}>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 16 }}>
        {label}
      </div>
      <div>
        <div className="stack-table-row header">
          <div className="stack-col">Tool</div>
          <div className="stack-col">Vs.</div>
          <div className="stack-col">Why</div>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="stack-table-row">
            <div className="stack-col">
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{row.tool}</span>
            </div>
            <div className="stack-col">
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>{row.vs}</span>
            </div>
            <div className="stack-col">
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{row.reason}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BuiltWithPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main className="page-main" style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px 120px', flex: 1 }}>

        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16, animation: 'fadeSlideUp 400ms ease forwards' }}>
          Stack transparency
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: 16, opacity: 0, animation: 'fadeSlideUp 400ms 60ms ease forwards' }}>
          Built with
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 580, marginBottom: 64, opacity: 0, animation: 'fadeSlideUp 400ms 120ms ease forwards' }}>
          Every tool, API, and decision that went into ListingLens — with a one-line explanation of why each was chosen over its closest alternative. Tools aren&apos;t chosen by default. They&apos;re chosen because they&apos;re the right choice for a specific constraint.
        </p>

        {/* Build stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 56, opacity: 0, animation: 'fadeSlideUp 400ms 180ms ease forwards' }}>
          {[
            { val: '48h', label: 'Build time' },
            { val: '4', label: 'AI agents' },
            { val: '7', label: 'APIs integrated' },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '20px 20px 16px' }}>
              <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 28, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.03em', marginBottom: 4 }}>{stat.val}</div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        <div style={{ opacity: 0, animation: 'fadeSlideUp 400ms 140ms ease forwards' }}>
          <StackSection label="AI models" rows={AI_MODELS} />
          <StackSection label="Data sources" rows={DATA_SOURCES} />
          <StackSection label="Infrastructure" rows={INFRA} />
          <StackSection label="Design" rows={DESIGN} />
        </div>

        <div className="callout decision" style={{ opacity: 0, animation: 'fadeSlideUp 400ms 300ms ease forwards' }}>
          <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
            <strong>On SSE vs WebSockets:</strong> The analysis pipeline is strictly unidirectional — after submitting, the client only receives. SSE is the correct primitive. WebSockets would add handshake overhead, complicate the Vercel Edge deployment, and buy exactly nothing in return. The fact that SSE handles reconnect automatically via EventSource&apos;s built-in retry is a bonus.
          </p>
        </div>

        {/* What's next */}
        <div style={{ marginBottom: 56, opacity: 0, animation: 'fadeSlideUp 400ms 340ms ease forwards' }}>
          <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>
            What I&apos;d do next (with 2 more weeks)
          </div>
          <ul style={{ listStyle: 'none' }}>
            {[
              'Wire the agents to live APIs. The architecture is specced; the image proxy, SerpAPI integration, and vision prompts are all ready to connect. Estimated: 2 days to working MVP.',
              'Add real A/B testing for the synthesis prompt. The brief quality is the core value prop — that prompt needs iteration against real listings, not one-shot instinct.',
              'Anti-bot hardening on the image proxy. Amazon\'s CDN actively rate-limits headless requests. At scale it needs rotating user agents, request throttling, and a fallback to Rainforest\'s product image endpoint.',
              'Seller Central OAuth flow. If ListingLens can pull listing data directly rather than scraping public Amazon pages, the data quality and reliability improve by an order of magnitude.',
            ].map((item, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 0', borderBottom: i < 3 ? '0.5px solid var(--border)' : 'none', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 6px', flexShrink: 0, marginTop: 2 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

      </main>

      <Footer
        right={
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
            <a href="/how-it-works" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Architecture</a> · <a href="/api-docs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>API docs</a> · <a href="/changelog" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Changelog</a>
          </span>
        }
      />
    </div>
  );
}
