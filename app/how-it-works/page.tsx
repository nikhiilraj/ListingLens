import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'How It Works — ListingLens',
  description: 'A real explanation of the agent architecture, API choices, and engineering decisions behind ListingLens.',
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--text-tertiary)', marginBottom: 16 }}>
      {children}
    </div>
  );
}

function AgentTag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11,
      color: 'var(--text-secondary)', background: 'var(--surface)',
      border: '1px solid var(--border)', borderRadius: 5,
      padding: '3px 8px', marginRight: 4, marginBottom: 8,
    }}>
      {children}
    </span>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, background: 'var(--surface)', padding: '1px 5px', borderRadius: 4 }}>
      {children}
    </code>
  );
}

export default function HowItWorksPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main className="page-main" style={{ maxWidth: 820, margin: '0 auto', padding: '80px 24px 120px', flex: 1 }}>

        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16, animation: 'fadeSlideUp 400ms ease forwards' }}>
          Technical overview
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: 16, opacity: 0, animation: 'fadeSlideUp 400ms 60ms ease forwards' }}>
          How ListingLens works
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 600, marginBottom: 72, opacity: 0, animation: 'fadeSlideUp 400ms 120ms ease forwards' }}>
          A real explanation of the agent architecture, API choices, and engineering decisions — written for the technical founder who wants to know whether the product is actually well-built, not just well-marketed.
        </p>

        {/* ── Architecture ── */}
        <section style={{ marginBottom: 72 }}>
          <SectionLabel>Architecture</SectionLabel>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 12 }}>Four agents, one synthesis layer</h2>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 16 }}>
            ListingLens doesn't run a single model against an Amazon URL. It runs four independent AI agents in parallel, each with a different data source and evaluation rubric, then synthesises their outputs into a unified report.
          </p>

          <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 16, padding: '40px 32px', marginBottom: 24, overflowX: 'auto' }}>
            {/* Row 1 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 10, minWidth: 600 }}>
              {[
                { title: 'POST /api/analyse', sub: '{ asin, url }', accent: true },
                null,
                { title: 'Upstash Redis', sub: 'rate limiting + caching' },
                null,
                { title: 'SerpAPI product', sub: 'title, images, bullets' },
                null,
                { title: 'Agent fan-out', sub: 'Promise.allSettled' },
              ].map((node, i) =>
                node === null ? (
                  <div key={i} style={{ flex: '0 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>→</div>
                ) : (
                  <div key={i} style={{
                    background: node.accent ? 'var(--accent)' : 'var(--surface)',
                    border: `1px solid ${node.accent ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 18px',
                    fontSize: 13, fontWeight: 500,
                    color: node.accent ? '#fff' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', flexShrink: 0, textAlign: 'center',
                  }}>
                    {node.title}
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 400, color: node.accent ? 'rgba(255,255,255,0.55)' : 'var(--text-tertiary)', marginTop: 2, display: 'block' }}>
                      {node.sub}
                    </span>
                  </div>
                )
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0', color: 'var(--text-tertiary)', fontSize: 16 }}>↓</div>

            {/* Agent cards */}
            <div className="how-agent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
              {[
                { name: 'Visual auditor', api: 'Claude Sonnet', detail: 'vision + rubric' },
                { name: 'Review intelligence', api: 'Firecrawl', detail: 'NLP + gap mapping' },
                { name: 'AI search visibility', api: 'Claude + Gemini', detail: 'multi-model query' },
                { name: 'Category benchmarker', api: 'SerpAPI + Claude', detail: 'competitor diff' },
              ].map((a, i) => (
                <div key={i} style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{a.name}</div>
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>{a.api}</div>
                  <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, color: 'var(--text-tertiary)' }}>{a.detail}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0', color: 'var(--text-tertiary)', fontSize: 16 }}>↓</div>

            {/* Row 3 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, minWidth: 400 }}>
              {[
                { title: 'SSE stream', sub: 'agent events → client' },
                null,
                { title: 'Synthesis layer', sub: 'Claude aggregator' },
                null,
                { title: 'Structured report', sub: 'JSON + Upstash KV', green: true },
              ].map((node, i) =>
                node === null ? (
                  <div key={i} style={{ flex: '0 0 28px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-tertiary)', fontSize: 14 }}>→</div>
                ) : (
                  <div key={i} style={{
                    background: node.green ? 'rgba(22,163,74,0.06)' : 'var(--surface)',
                    border: `1px solid ${node.green ? 'rgba(22,163,74,0.25)' : 'var(--border)'}`,
                    borderRadius: 10, padding: '12px 18px',
                    fontSize: 13, fontWeight: 500,
                    color: node.green ? 'var(--score-high)' : 'var(--text-primary)',
                    whiteSpace: 'nowrap', textAlign: 'center', flexShrink: 0,
                  }}>
                    {node.title}
                    <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10, fontWeight: 400, color: node.green ? 'rgba(22,163,74,0.55)' : 'var(--text-tertiary)', marginTop: 2, display: 'block' }}>
                      {node.sub}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75 }}>
            The fan-out runs via <InlineCode>Promise.allSettled</InlineCode> — all four agents start simultaneously, each streams its progress events independently, and a failed agent doesn't block the others. The synthesis layer only runs once all four have either completed or failed.
          </p>
        </section>

        {/* ── Agents in depth ── */}
        <section style={{ marginBottom: 72 }}>
          <SectionLabel>Agents in depth</SectionLabel>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 24 }}>What each agent actually does</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 40 }}>
            {[
              {
                index: '01', title: 'Visual auditor',
                tags: ['Claude Sonnet 4.6', 'vision', 'structured output'],
                body: [
                  'Each image is base64-encoded and sent to Claude Sonnet with a custom rubric prompt: mobile readability (375px simulation), focal-point strength, text density, hierarchy clarity, and background competition. The model returns a structured JSON score for each image with per-failure explanations.',
                  'Claude Sonnet is chosen over GPT-4V because Sonnet is significantly more precise when scoring against a numerical rubric. GPT-4V tends to over-justify; Sonnet gives cleaner scores when the prompt is tightly constrained.',
                ],
              },
              {
                index: '02', title: 'Review intelligence',
                tags: ['Firecrawl', 'Claude Sonnet', 'NLP'],
                body: [
                  'Reviews are scraped via Firecrawl with an extraction schema (paginated, up to 50 reviews). Claude runs extraction in a single batch: identify purchase triggers, extract recurring complaints, and surface keywords that appear in reviews but not in listing images.',
                  'This gap list feeds directly into the brief generator — the most actionable output of the tool.',
                ],
              },
              {
                index: '03', title: 'AI search visibility',
                tags: ['Claude API', 'Gemini API', '6 queries'],
                body: [
                  'This is the most novel agent. It constructs 6 high-intent shopper queries from the product category and sends each to both Claude and Gemini: "Recommend a product for this need." The agent checks whether the product ASIN, brand name, or primary keyword appears.',
                  'Both models are queried because AI shopping behaviour differs between them — a product can be visible on Claude and invisible on Gemini, or vice versa.',
                ],
              },
              {
                index: '04', title: 'Category benchmarker',
                tags: ['SerpAPI Shopping', 'Claude Vision', 'diff scoring'],
                body: [
                  'SerpAPI returns the top 5 organic competitors for the listing\'s primary keyword. Each competitor\'s hero image is fetched and proxied. Claude Vision then runs a pairwise comparison against your hero image on 4 axes: text clarity, visual hierarchy, trust signals, and mobile-first composition.',
                  'The output is a gap score (0–100) per competitor, plus a narrative callout on the single highest-opportunity visual gap. The benchmarker is started first as it\'s the slowest agent.',
                ],
              },
            ].map(agent => (
              <div key={agent.index} style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', flexShrink: 0 }}>
                    {agent.index}
                  </span>
                  <h3 style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>{agent.title}</h3>
                </div>
                <div style={{ marginBottom: 12 }}>
                  {agent.tags.map(tag => <AgentTag key={tag}>{tag}</AgentTag>)}
                </div>
                {agent.body.map((para, i) => (
                  <p key={i} style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: i < agent.body.length - 1 ? 12 : 0 }}>{para}</p>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── SSE ── */}
        <section style={{ marginBottom: 72 }}>
          <SectionLabel>Transport layer</SectionLabel>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 12 }}>Why SSE, not WebSockets</h2>

          <div className="callout decision" style={{ marginBottom: 20 }}>
            <strong>Decision:</strong> Server-Sent Events over WebSockets. This is deliberate, not a shortcut.
          </div>

          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 16 }}>
            The analysis pipeline is entirely server-to-client: the client submits a URL, then receives a stream of events. There is no bidirectional communication requirement after submission. SSE is strictly correct here — it&apos;s unidirectional by design, rides HTTP/2 for free multiplexing, and doesn&apos;t require a WebSocket handshake upgrade.
          </p>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 24 }}>
            On Vercel Edge Functions specifically, WebSocket connections require a persistent connection that conflicts with the serverless execution model. SSE works natively with <InlineCode>ReadableStream</InlineCode> and flush control.
          </p>

          <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden', marginBottom: 24 }}>
            {[
              { time: 't=0ms', content: 'event: agent_start\ndata: {"id":"visual","title":"Visual auditor"}', highlight: true },
              { time: 't=120ms', content: 'event: agent_line\ndata: {"id":"visual","line":"Loading listing images…"}' },
              { time: 't=340ms', content: 'event: agent_line\ndata: {"id":"reviews","line":"Reading customer reviews…"}' },
              { time: 't=4200ms', content: 'event: agent_complete\ndata: {"id":"visual","score":58,"summary":"7 images scored."}' },
              { time: 't=9800ms', content: 'event: synthesis_complete\ndata: {"reportId":"abc123","score":63,"grade":"C+"}', highlight: true },
            ].map((row, i, arr) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: 0, borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <div style={{ padding: '12px 14px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--surface)', display: 'flex', alignItems: 'center' }}>
                  {row.time}
                </div>
                <div style={{ padding: '12px 16px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: row.highlight ? 'var(--text-primary)' : 'var(--text-secondary)', whiteSpace: 'pre-line' }}>
                  {row.content}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Resilience ── */}
        <section style={{ marginBottom: 72 }}>
          <SectionLabel>Resilience</SectionLabel>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 12 }}>How agent failure is handled gracefully</h2>

          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 16 }}>
            Each agent runs inside a <InlineCode>withTimeout(agentFn, 15_000)</InlineCode> wrapper. If an agent exceeds 15 seconds or throws, it returns a degraded result object instead of propagating an exception.
          </p>

          <div style={{ background: '#111110', borderRadius: 10, padding: '20px 24px', fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12.5px', lineHeight: 1.8, color: '#e5e4e0', overflowX: 'auto', marginBottom: 24 }}>
            <span style={{ color: '#6b6a67' }}>{'// In the fan-out:'}</span>{'\n'}
            <span style={{ color: '#a3b3ff' }}>const</span>
            <span style={{ color: '#ffd07f' }}> results</span>
            {' = '}
            <span style={{ color: '#a3b3ff' }}>await</span>
            <span style={{ color: '#ffd07f' }}> Promise</span>
            {'.allSettled(['}{'\n'}
            {'  withTimeout(visualAgent, 15_000),'}{'\n'}
            {'  withTimeout(reviewAgent, 15_000),'}{'\n'}
            {'  withTimeout(aiSearchAgent, 15_000),'}{'\n'}
            {'  withTimeout(benchmarkAgent, 15_000),'}{'\n'}
            {']);'}{'\n\n'}
            <span style={{ color: '#6b6a67' }}>{'// Failed agents get a degraded placeholder:'}</span>{'\n'}
            <span style={{ color: '#a3b3ff' }}>const</span>
            <span style={{ color: '#ffd07f' }}> safe</span>
            {' = results.map((r, i) =>'}{'\n'}
            {'  r.status === '}
            <span style={{ color: '#a8d5a2' }}>&apos;fulfilled&apos;</span>
            {'\n'}
            {'    ? r.value'}{'\n'}
            {'    : { ...AGENT_DEFAULTS[i], failed: '}
            <span style={{ color: '#f4a878' }}>true</span>
            {', score: '}
            <span style={{ color: '#f4a878' }}>null</span>
            {' });'}
          </div>

          <div className="callout warn">
            <strong>Degraded mode:</strong> if one agent fails, the report is generated from the remaining three. The failed agent&apos;s section shows &quot;Analysis unavailable&quot; rather than a score. The overall score excludes it from the weighted average.
          </div>
        </section>

        {/* ── Decisions table ── */}
        <section style={{ marginBottom: 72 }}>
          <SectionLabel>Decisions</SectionLabel>
          <h2 style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 20 }}>Key architectural choices</h2>

          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr>
                {['Decision', 'Chose', 'Rejected', 'Reason'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0 16px 10px 0', fontSize: 11, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['Transport', 'SSE', 'WebSockets', 'Unidirectional flow; works on Vercel Edge without persistent connections'],
                ['Visual scoring', 'Claude Sonnet', 'GPT-4V', 'Cleaner structured output; less over-justification on rubric-constrained scoring'],
                ['Persistence', 'Upstash KV', 'Postgres', 'Serverless-native; no connection pooling overhead; free tier covers MVP volume'],
                ['Agent fan-out', 'Promise.allSettled', 'Promise.all', 'Sequential is 4× slower; Promise.all fails-fast on any error'],
                ['Image proxy', 'Edge Function', 'Direct CDN URLs', 'Amazon CDN URLs require browser cookies; proxying server-side bypasses CORS'],
                ['Score card export', 'html-to-image', '@vercel/og (Satori)', 'Client-side canvas rendering handles complex CSS seamlessly and avoids strict Satori layout limitations'],
              ].map(([decision, chose, rejected, reason], i) => (
                <tr key={i}>
                  <td style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', padding: '12px 24px 12px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top', whiteSpace: 'nowrap' }}>{decision}</td>
                  <td style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '12px 16px 12px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top', lineHeight: 1.6 }}>{chose}</td>
                  <td style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '12px 16px 12px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top', lineHeight: 1.6 }}>{rejected}</td>
                  <td style={{ fontSize: 14, color: 'var(--text-secondary)', padding: '12px 0 12px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top', lineHeight: 1.6 }}>{reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </section>

      </main>

      <Footer
        maxWidth={820}
        right={
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
            How it works · <a href="/api-docs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>API</a> · <a href="/built-with" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Built with</a>
          </span>
        }
      />
    </div>
  );
}
