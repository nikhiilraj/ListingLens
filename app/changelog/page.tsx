import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Changelog — ListingLens',
  description: 'A reverse-chronological record of every build decision, ship, and fix.',
};

const ENTRIES = [
  {
    date: 'May 3, 2026',
    dayLabel: 'Day 2 — 11:00pm',
    version: 'v0.4',
    title: 'All 5 supporting pages shipped',
    desc: 'Added How It Works, API Docs, Shareable Results, Built With, and Changelog pages. Navbar updated with full navigation. Each page is designed for a specific audience — technical founders, API consumers, and referred visitors from shared reports.',
    latest: true,
    changes: [
      { type: 'new', text: <><strong>How It Works</strong> — agent architecture diagram, SSE decision, graceful failure pattern with <code className="inline-code">Promise.allSettled</code></> },
      { type: 'new', text: <><strong>API Docs</strong> — <code className="inline-code">POST /api/analyse</code>, <code className="inline-code">GET /api/results/:id</code>, SSE stream spec with full event types, schema tables</> },
      { type: 'new', text: <><strong>Shareable Results</strong> — permanent public report URL with viral CTA strip; the PLG distribution mechanic</> },
      { type: 'new', text: <><strong>Built With</strong> — tool decisions with rationale: Claude vs GPT-4V, SSE vs WebSockets, Upstash vs Postgres, DM Sans vs Inter</> },
      { type: 'new', text: <><strong>Changelog</strong> — this page</> },
      { type: 'improve', text: <>Navbar updated across all pages with consistent active states</> },
    ],
  },
  {
    date: 'May 3, 2026',
    dayLabel: 'Day 2 — 2:00pm',
    version: 'v0.3',
    title: 'Report page complete + shareable score card',
    desc: 'Full report render: per-image breakdown, before/after conversion leak section, AI search query table, competitor comparison. Score card with copyable share link. Pixii design brief generator with copy-to-clipboard.',
    latest: false,
    changes: [
      { type: 'new', text: <><strong>Score card</strong> — shareable snapshot with bullet callouts and &quot;Get fixed with Pixii&quot; CTA</> },
      { type: 'new', text: <><strong>Design brief section</strong> — 9 structured fields synthesised from agent findings; copy button with 2s feedback</> },
      { type: 'new', text: <><strong>Competitor comparison</strong> — side-by-side hero images with gap narrative</> },
      { type: 'new', text: <><strong>Before/after section</strong> — dashed red callout overlay on current hero with prescription copy</> },
      { type: 'improve', text: <>Score animates from 0 → target on report reveal using <code className="inline-code">requestAnimationFrame</code> + easeOutCubic</> },
      { type: 'improve', text: <>Segment bar chart animates in with staggered <code className="inline-code">width</code> transitions per segment</> },
    ],
  },
  {
    date: 'May 2, 2026',
    dayLabel: 'Day 1 — 11:00pm',
    version: 'v0.2',
    title: 'Category benchmarker agent + streaming dashboard',
    desc: 'Added the 4th agent (category benchmarker) and wired the full agent fan-out. Realised while building that the agent states needed to be decoupled from each other — they run at different speeds and must not block.',
    latest: false,
    changes: [
      { type: 'new', text: <><strong>Category benchmarker agent</strong> — SerpAPI Shopping + Claude Vision competitor diff; started first (slowest agent at ~8s)</> },
      { type: 'arch', text: <>Decoupled agent state management: each agent&apos;s line stream is independently tracked; no shared mutex needed</> },
      { type: 'fix', text: <>Agent cards were flickering on line updates due to full re-render — fixed by keying on agent ID, not array index</> },
      { type: 'improve', text: <>Synthesis &quot;Analysing…&quot; → &quot;Complete&quot; transition now waits for all 4 agent <code className="inline-code">complete</code> states before triggering</> },
    ],
  },
  {
    date: 'May 2, 2026',
    dayLabel: 'Day 1 — 3:00pm',
    version: 'v0.1',
    title: 'Core agent pipeline + streaming dashboard',
    desc: 'First working build. Hero → URL submission → 3-agent streaming dashboard. The core loop works end to end: submit, watch agents run in real time, see the synthesis line.',
    latest: false,
    changes: [
      { type: 'new', text: <><strong>Visual auditor agent</strong> — Claude Sonnet vision, rubric scoring, per-image failure callouts</> },
      { type: 'new', text: <><strong>Review intelligence agent</strong> — Firecrawl + NLP, keyword gap extraction</> },
      { type: 'new', text: <><strong>AI search visibility agent</strong> — 6 queries across Claude + Gemini, visibility rate scoring</> },
      { type: 'new', text: <><strong>SSE streaming dashboard</strong> — parallel agent cards with typewriter line output, status transitions (waiting → running → complete)</> },
      { type: 'new', text: <><strong>URL validation</strong> — inline error state for non-Amazon <code className="inline-code">/dp/</code> URLs</> },
      { type: 'arch', text: <>Chose SSE over WebSockets: analysis is strictly server-to-client; SSE rides HTTP/2 natively and works on Vercel Edge without persistent connections</> },
      { type: 'arch', text: <>Agent fan-out via <code className="inline-code">Promise.allSettled</code>: prevents a single slow/failed agent from blocking the others; degraded mode ships partial results</> },
      { type: 'fix', text: <>Character streaming was scheduling too aggressively — added <code className="inline-code">Math.random() * 20</code> jitter to make it feel natural rather than mechanical</> },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '80px 24px 120px', flex: 1 }}>

        <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16, animation: 'fadeSlideUp 400ms ease forwards' }}>
          Release history
        </div>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--text-primary)', marginBottom: 16, opacity: 0, animation: 'fadeSlideUp 400ms 60ms ease forwards' }}>
          Changelog
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 520, marginBottom: 64, opacity: 0, animation: 'fadeSlideUp 400ms 120ms ease forwards' }}>
          A reverse-chronological record of every build decision, ship, and fix. Treating this as a real product means documenting as you go — not just at the end.
        </p>

        {/* Currently building */}
        <div style={{
          background: 'rgba(22,163,74,0.04)',
          border: '1px solid rgba(22,163,74,0.2)',
          borderRadius: 10,
          padding: '14px 18px',
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 48,
          fontSize: 14, color: 'var(--text-secondary)',
          opacity: 0, animation: 'fadeSlideUp 400ms 140ms ease forwards',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--score-high)', flexShrink: 0, animation: 'pulse-dot 1.5s ease infinite' }} />
          <span>Currently building: live API wiring, image proxy, Seller Central OAuth integration</span>
        </div>

        {/* Timeline */}
        <div>
          {ENTRIES.map((entry, idx) => (
            <div
              key={idx}
              style={{
                display: 'grid',
                gridTemplateColumns: '160px 1fr',
                opacity: 0,
                animation: `fadeSlideUp 400ms ${160 + idx * 60}ms ease forwards`,
              }}
            >
              {/* Left: date + dot */}
              <div style={{ padding: '32px 32px 32px 0', position: 'relative' }}>
                {idx < ENTRIES.length - 1 && (
                  <div style={{ position: 'absolute', right: -1, top: 44, bottom: 0, width: 1, background: 'var(--border)' }} />
                )}
                <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>
                  {entry.date}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
                  {entry.dayLabel}
                </div>
                <div style={{
                  position: 'absolute',
                  right: -5, top: 40,
                  width: 9, height: 9,
                  borderRadius: '50%',
                  background: entry.latest ? 'var(--score-high)' : 'var(--white)',
                  border: `2px solid ${entry.latest ? 'var(--score-high)' : 'var(--border)'}`,
                  boxShadow: entry.latest ? '0 0 0 3px rgba(22,163,74,0.15)' : 'none',
                  zIndex: 1,
                }} />
              </div>

              {/* Right: content */}
              <div style={{ padding: '32px 0 32px 32px', borderLeft: idx < ENTRIES.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '2px 7px', flexShrink: 0, marginTop: 2 }}>
                    {entry.version}
                  </span>
                  <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    {entry.title}
                  </span>
                </div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
                  {entry.desc}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {entry.changes.map((change, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <span className={`change-type ${change.type}`}>{change.type}</span>
                      <span style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {change.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

      </main>

      <Footer
        maxWidth={680}
        left="ListingLens — 48h build · May 2026"
        right={
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
            <a href="/how-it-works" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Architecture</a> · <a href="/built-with" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Built with</a> · <a href="/api-docs" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>API</a>
          </span>
        }
      />
    </div>
  );
}
