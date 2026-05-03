'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 4, padding: '1px 5px', color: 'var(--text-secondary)' }}>
      {children}
    </code>
  );
}

function MethodBadge({ method }: { method: 'POST' | 'GET' }) {
  const colors = {
    POST: { bg: 'rgba(22,163,74,0.1)', color: 'var(--score-high)' },
    GET: { bg: 'rgba(37,99,235,0.08)', color: '#2563eb' },
  };
  return (
    <span style={{
      fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, fontWeight: 500,
      padding: '4px 10px', borderRadius: 6,
      background: colors[method].bg, color: colors[method].color, letterSpacing: '0.02em',
    }}>
      {method}
    </span>
  );
}

function CodeBlock({ lang, children }: { lang: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative', marginBottom: 24 }}>
      <div style={{
        background: '#1c1b1a', borderRadius: '10px 10px 0 0', padding: '10px 18px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid #2d2c2b',
      }}>
        <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: '#6b6a67' }}>{lang}</span>
        <button
          style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: copied ? '#a8d5a2' : '#6b6a67', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, transition: 'color 150ms' }}
          onClick={() => {
            const pre = document.querySelector(`[data-lang="${lang}"]`);
            if (pre) {
              navigator.clipboard.writeText(pre.textContent ?? '').catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        data-lang={lang}
        style={{
          background: '#111110', borderRadius: '0 0 10px 10px', padding: '20px 24px',
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12.5px', lineHeight: 1.8,
          color: '#e5e4e0', overflowX: 'auto', margin: 0,
        }}
      >
        {children}
      </pre>
    </div>
  );
}

function SchemaTable({ rows }: { rows: { key: string; type: string; desc: React.ReactNode }[] }) {
  return (
    <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '220px 100px 1fr', background: 'var(--surface)' }}>
        {['Field', 'Type', 'Description'].map(h => (
          <div key={h} style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '8px 14px' }}>{h}</div>
        ))}
      </div>
      {rows.map((row, i) => (
        <div key={i} style={{ display: 'grid', gridTemplateColumns: '220px 100px 1fr', borderTop: '0.5px solid var(--border)' }}>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--text-primary)', padding: '10px 14px' }}>{row.key}</div>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: '#2563eb', padding: '10px 14px', display: 'flex', alignItems: 'center' }}>{row.type}</div>
          <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', padding: '10px 14px', lineHeight: 1.5, display: 'flex', alignItems: 'center' }}>{row.desc}</div>
        </div>
      ))}
    </div>
  );
}

function ParamTable({ rows }: { rows: { name: string; type: string; required: boolean; desc: React.ReactNode }[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8, fontSize: 13 }}>
      <thead>
        <tr>
          {['Parameter', 'Type', 'Required', 'Description'].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '0 12px 8px 0', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            <td style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, padding: '11px 12px 11px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top' }}>{row.name}</td>
            <td style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-secondary)', padding: '11px 12px 11px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top' }}>{row.type}</td>
            <td style={{ padding: '11px 12px 11px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top' }}>
              {row.required
                ? <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--score-high)', background: 'rgba(22,163,74,0.08)', borderRadius: 4, padding: '1px 5px' }}>required</span>
                : <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)', background: 'var(--surface)', borderRadius: 4, padding: '1px 5px' }}>optional</span>}
            </td>
            <td style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '11px 0 11px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top' }}>{row.desc}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const SIDEBAR_SECTIONS = [
  { label: 'Overview', links: [{ id: 'intro', label: 'Introduction' }, { id: 'auth', label: 'Authentication' }, { id: 'errors', label: 'Errors' }, { id: 'ratelimits', label: 'Rate limits' }] },
  { label: 'Endpoints', links: [{ id: 'analyse', label: 'POST /api/analyse' }, { id: 'results', label: 'GET /api/results/:id' }, { id: 'stream', label: 'GET /api/stream/:id' }] },
  { label: 'Schema', links: [{ id: 'report-schema', label: 'Report object' }, { id: 'agent-schema', label: 'Agent result' }] },
];

export default function ApiDocsPage() {
  const [activeId, setActiveId] = useState('intro');

  useEffect(() => {
    const sections = document.querySelectorAll('[data-section]');
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveId(e.target.id);
        });
      },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    sections.forEach(s => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <div style={{ display: 'grid', gridTemplateColumns: '224px 1fr', minHeight: 'calc(100vh - 56px)' }}>

        {/* Sidebar */}
        <aside style={{
          borderRight: '0.5px solid var(--border)',
          background: 'var(--white)',
          padding: '32px 0',
          position: 'sticky',
          top: 56,
          height: 'calc(100vh - 56px)',
          overflowY: 'auto',
        }}>
          {SIDEBAR_SECTIONS.map(section => (
            <div key={section.label} style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', padding: '0 20px', marginBottom: 6 }}>
                {section.label}
              </div>
              {section.links.map(link => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  className={`sidebar-link${activeId === link.id ? ' active' : ''}`}
                >
                  {link.label}
                </a>
              ))}
            </div>
          ))}
        </aside>

        {/* Content */}
        <main style={{ padding: '56px 64px 120px', maxWidth: 840 }}>

          <section id="intro" data-section>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: '-0.035em', color: 'var(--text-primary)', marginBottom: 12 }}>API reference</h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 56, maxWidth: 520 }}>
              The ListingLens API lets you programmatically submit Amazon listings for analysis and retrieve structured results. Results are stored permanently and retrievable by report ID.
            </p>
          </section>

          {/* Auth */}
          <section id="auth" data-section style={{ marginBottom: 80 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 10 }}>Authentication</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 14 }}>
              Authenticate by passing your API key in the <InlineCode>Authorization</InlineCode> header as a Bearer token.
            </p>
            <CodeBlock lang="http">
              {'Authorization: Bearer '}
              <span style={{ color: '#ffd07f' }}>ll_live_sk_a1b2c3d4e5f6...</span>
            </CodeBlock>
            <div style={{ display: 'flex', gap: 12, background: 'var(--surface)', borderRadius: 10, padding: '16px 18px', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <circle cx="8" cy="8" r="7.5" stroke="#a8a7a3" />
                <path d="M8 5v4M8 11v.5" stroke="#a8a7a3" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              API keys prefixed <InlineCode>ll_live_</InlineCode> are production keys; <InlineCode>ll_test_</InlineCode> keys return mocked results without consuming analysis credits.
            </div>
          </section>

          <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '56px 0' }} />

          {/* POST /api/analyse */}
          <section id="analyse" data-section style={{ marginBottom: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <MethodBadge method="POST" />
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                https://api.listinglens.com/v1/analyse
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 10 }}>Submit a listing for analysis</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 14 }}>
              Submits an Amazon listing URL for full 4-agent analysis. Returns immediately with a <InlineCode>reportId</InlineCode> — use this to poll <InlineCode>GET /api/results/:id</InlineCode> or connect to the SSE stream.
            </p>

            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '28px 0 12px' }}>Request body</h3>
            <ParamTable rows={[
              { name: 'url', type: 'string', required: true, desc: 'Full Amazon listing URL including the /dp/ path segment. ASIN is extracted server-side.' },
              { name: 'agents', type: 'string[]', required: false, desc: <>Subset of agents to run. Default: all four. Options: <InlineCode>visual</InlineCode>, <InlineCode>reviews</InlineCode>, <InlineCode>ai_search</InlineCode>, <InlineCode>benchmark</InlineCode>.</> },
              { name: 'webhook_url', type: 'string', required: false, desc: 'HTTPS URL to POST the completed report to. Useful for async workflows.' },
              { name: 'metadata', type: 'object', required: false, desc: 'Arbitrary key-value pairs attached to the report for your internal tracking.' },
            ]} />

            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '28px 0 12px' }}>cURL example</h3>
            <CodeBlock lang="shell">
              <span style={{ color: '#ffd07f' }}>curl</span>
              {' -X POST https://api.listinglens.com/v1/analyse \\\n  -H '}
              <span style={{ color: '#a8d5a2' }}>&quot;Authorization: Bearer ll_live_sk_a1b2c3d4e5f6&quot;</span>
              {' \\\n  -H '}
              <span style={{ color: '#a8d5a2' }}>&quot;Content-Type: application/json&quot;</span>
              {' \\\n  -d '}
              <span style={{ color: '#a8d5a2' }}>{`'{\n    "url": "https://www.amazon.com/dp/B08N5WRWNW",\n    "agents": ["visual", "reviews", "ai_search", "benchmark"]\n  }'`}</span>
            </CodeBlock>

            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '28px 0 12px' }}>Response</h3>
            <CodeBlock lang="json">
              {'{\n  '}
              <span style={{ color: '#a8d5a2' }}>&quot;reportId&quot;</span>
              {': '}
              <span style={{ color: '#a8d5a2' }}>&quot;rpt_abc123xyz&quot;</span>
              {',\n  '}
              <span style={{ color: '#a8d5a2' }}>&quot;status&quot;</span>
              {': '}
              <span style={{ color: '#a8d5a2' }}>&quot;running&quot;</span>
              {',\n  '}
              <span style={{ color: '#a8d5a2' }}>&quot;asin&quot;</span>
              {': '}
              <span style={{ color: '#a8d5a2' }}>&quot;B08N5WRWNW&quot;</span>
              {',\n  '}
              <span style={{ color: '#a8d5a2' }}>&quot;estimatedSeconds&quot;</span>
              {': '}
              <span style={{ color: '#f4a878' }}>90</span>
              {'\n}'}
            </CodeBlock>
          </section>

          <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '56px 0' }} />

          {/* GET /api/results/:id */}
          <section id="results" data-section style={{ marginBottom: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <MethodBadge method="GET" />
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                https://api.listinglens.com/v1/results/:reportId
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 10 }}>Retrieve a completed report</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 14 }}>
              Returns the full structured report for a given <InlineCode>reportId</InlineCode>. Reports are stored permanently — there is no expiry.
            </p>

            <h3 id="report-schema" data-section style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '28px 0 12px' }}>
              Report object
            </h3>
            <SchemaTable rows={[
              { key: 'reportId', type: 'string', desc: <>Unique report identifier, prefixed <InlineCode>rpt_</InlineCode></> },
              { key: 'status', type: 'enum', desc: <><InlineCode>running</InlineCode> | <InlineCode>complete</InlineCode> | <InlineCode>failed</InlineCode></> },
              { key: 'score', type: 'number', desc: 'Overall listing score 0–100. Weighted mean of agent scores.' },
              { key: 'grade', type: 'string', desc: 'Letter grade (A+, A, B, C+, C, D, F) derived from score.' },
              { key: 'asin', type: 'string', desc: 'Amazon ASIN extracted from submitted URL.' },
              { key: 'agents', type: 'AgentResult[]', desc: 'Array of 4 agent result objects.' },
              { key: 'brief', type: 'Brief', desc: 'Generated Pixii design brief. Null if synthesis not yet complete.' },
              { key: 'shareUrl', type: 'string', desc: 'Permanent public URL for this report. No auth required to view.' },
              { key: 'createdAt', type: 'ISO 8601', desc: 'UTC timestamp when analysis was submitted.' },
            ]} />

            <h3 id="agent-schema" data-section style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '28px 0 12px' }}>
              Agent result object
            </h3>
            <SchemaTable rows={[
              { key: 'id', type: 'string', desc: <><InlineCode>visual</InlineCode> | <InlineCode>reviews</InlineCode> | <InlineCode>ai_search</InlineCode> | <InlineCode>benchmark</InlineCode></> },
              { key: 'status', type: 'enum', desc: <><InlineCode>complete</InlineCode> | <InlineCode>failed</InlineCode> | <InlineCode>running</InlineCode> | <InlineCode>waiting</InlineCode></> },
              { key: 'score', type: 'number | null', desc: 'Agent score 0–100. Null if failed.' },
              { key: 'summary', type: 'string', desc: 'One-sentence summary of findings.' },
              { key: 'failed', type: 'boolean', desc: 'True if the agent timed out or errored. Report is still generated without this score.' },
              { key: 'durationMs', type: 'number', desc: 'Agent wall-clock time in milliseconds.' },
            ]} />
          </section>

          <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '56px 0' }} />

          {/* SSE stream */}
          <section id="stream" data-section style={{ marginBottom: 80 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <MethodBadge method="GET" />
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' }}>
                https://api.listinglens.com/v1/stream/:reportId
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 10 }}>Subscribe to live agent events</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 14 }}>
              Opens a Server-Sent Events stream that emits real-time agent progress events. The stream closes automatically once <InlineCode>synthesis_complete</InlineCode> is emitted.
            </p>

            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '28px 0 12px' }}>Event types</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 13 }}>
              <thead>
                <tr>
                  {['Event', 'Data shape', 'Description'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0 12px 8px 0', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['agent_start', '{"id", "title"}', 'An agent has begun execution.'],
                  ['agent_line', '{"id", "line"}', 'A new log line from a running agent. Stream these to the UI for the typewriter effect.'],
                  ['agent_complete', '{"id", "score", "summary"}', 'An agent has finished. Score and summary are available immediately.'],
                  ['agent_failed', '{"id", "reason"}', 'An agent timed out or errored. Analysis continues with remaining agents.'],
                  ['synthesis_start', '{}', 'All agents done; synthesis layer is running.'],
                  ['synthesis_complete', '{"reportId", "score", "grade"}', 'Full report is ready. Fetch from GET /api/results/:id.'],
                  ['analysis_failed', '{"reason"}', 'Unrecoverable failure (e.g. invalid ASIN, all agents timed out).'],
                ].map(([event, shape, desc], i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--text-primary)', padding: '11px 12px 11px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top' }}>{event}</td>
                    <td style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-secondary)', padding: '11px 12px 11px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top' }}>{shape}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '11px 0', borderBottom: '0.5px solid var(--border)', verticalAlign: 'top', lineHeight: 1.55 }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', margin: '28px 0 12px' }}>JavaScript example</h3>
            <CodeBlock lang="javascript">
              <span style={{ color: '#6b6a67' }}>{'// 1. Submit the listing'}</span>
              {'\n'}
              <span style={{ color: '#a3b3ff' }}>const</span>
              <span style={{ color: '#ffd07f' }}> res</span>
              {' = '}
              <span style={{ color: '#a3b3ff' }}>await</span>
              {' fetch('}
              <span style={{ color: '#a8d5a2' }}>&apos;https://api.listinglens.com/v1/analyse&apos;</span>
              {', {\n  method: '}
              <span style={{ color: '#a8d5a2' }}>&apos;POST&apos;</span>
              {',\n  headers: { '}
              <span style={{ color: '#a8d5a2' }}>&apos;Content-Type&apos;</span>
              {': '}
              <span style={{ color: '#a8d5a2' }}>&apos;application/json&apos;</span>
              {' },\n  body: JSON.stringify({ url: '}
              <span style={{ color: '#a8d5a2' }}>&apos;https://amazon.com/dp/B08N5WRWNW&apos;</span>
              {' }),\n});\n'}
              <span style={{ color: '#a3b3ff' }}>const</span>
              <span style={{ color: '#ffd07f' }}> {'{ reportId }'}</span>
              {' = '}
              <span style={{ color: '#a3b3ff' }}>await</span>
              {' res.json();\n\n'}
              <span style={{ color: '#6b6a67' }}>{'// 2. Connect to the SSE stream'}</span>
              {'\n'}
              <span style={{ color: '#a3b3ff' }}>const</span>
              <span style={{ color: '#ffd07f' }}> source</span>
              {' = '}
              <span style={{ color: '#a3b3ff' }}>new</span>
              <span style={{ color: '#ffd07f' }}> EventSource</span>
              {'(`https://api.listinglens.com/v1/stream/'}
              <span style={{ color: '#ffd07f' }}>{'${reportId}'}</span>
              {'`);\n\nsource.addEventListener('}
              <span style={{ color: '#a8d5a2' }}>&apos;synthesis_complete&apos;</span>
              {', async (e) => {\n  '}
              <span style={{ color: '#a3b3ff' }}>const</span>
              <span style={{ color: '#ffd07f' }}> {'{ reportId }'}</span>
              {' = JSON.parse(e.data);\n  source.close();\n});'}
            </CodeBlock>
          </section>

          <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', margin: '56px 0' }} />

          {/* Status codes */}
          <section id="errors" data-section style={{ marginBottom: 80 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 16 }}>Status codes</h2>
            <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              {[
                { code: '200', type: 'ok', msg: 'Request succeeded. Body contains the response object.' },
                { code: '202', type: 'ok', msg: 'Analysis submitted successfully. Not yet complete — use the stream URL or poll GET /results/:id.' },
                { code: '400', type: 'err', msg: <>Bad request. Missing required fields or invalid URL. Body contains a <InlineCode>message</InlineCode> field.</> },
                { code: '401', type: 'err', msg: 'Missing or invalid API key. Check your Authorization header.' },
                { code: '429', type: 'ratelimit', msg: <>Rate limit exceeded. See Retry-After header. Default limit: 10 analyses/minute per key.</> },
                { code: '500', type: 'err', msg: <>Internal error. Retryable errors include a <InlineCode>retryable: true</InlineCode> field.</> },
              ].map((row, i, arr) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                  <div style={{
                    fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, fontWeight: 500, padding: '11px 16px', minWidth: 72,
                    color: row.type === 'ok' ? 'var(--score-high)' : row.type === 'ratelimit' ? 'var(--score-mid)' : 'var(--score-low)',
                  }}>
                    {row.code}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '11px 16px', flex: 1, lineHeight: 1.5 }}>{row.msg}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Rate limits */}
          <section id="ratelimits" data-section style={{ marginBottom: 80 }}>
            <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.025em', color: 'var(--text-primary)', marginBottom: 10 }}>Rate limits</h2>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: 14 }}>
              Rate limits are applied per API key. When a limit is exceeded, the response includes a <InlineCode>Retry-After</InlineCode> header.
            </p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Tier', 'Analyses / min', 'Analyses / day', 'Concurrent streams'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '0 12px 8px 0', fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Free', '10', '200', '3'],
                  ['Pro', '60', '2,000', '20'],
                  ['Enterprise', 'custom', 'custom', 'custom'],
                ].map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ fontFamily: j === 0 ? 'var(--font-jetbrains-mono)' : undefined, fontSize: 13, color: j === 0 ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '11px 12px 11px 0', borderBottom: '0.5px solid var(--border)' }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

        </main>
      </div>

      <Footer
        left="ListingLens API v1 · Last updated May 2026"
        right={
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
            <a href="/how-it-works" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Architecture</a> · <a href="/changelog" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Changelog</a>
          </span>
        }
      />
    </div>
  );
}
