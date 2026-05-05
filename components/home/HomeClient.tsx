'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ScoreCard from '@/components/report/ScoreCard';
import PixiiBrief from '@/components/report/PixiiBrief';

import type { ProductData } from '@/lib/schemas/product';
import type { Report } from '@/lib/schemas/report';
import type { VisualAudit } from '@/lib/schemas/visual';
import type { ReviewIntelligence } from '@/lib/schemas/review';
import type { AISearch } from '@/lib/schemas/search';
import type { Benchmark } from '@/lib/schemas/benchmark';

interface CachedResult {
  id: string;
  asin: string;
  product: ProductData;
  report: Report | null;
  visual: VisualAudit | null;
  review: ReviewIntelligence | null;
  search: AISearch | null;
  benchmark: Benchmark | null;
}

// ── Types ─────────────────────────────────────────────────────────
type AgentState = 'waiting' | 'running' | 'complete';
type Phase = 'idle' | 'running' | 'complete';
type SynthState = 'hidden' | 'synth' | 'done';

interface Agent {
  id: string;
  title: string;
  lines: string[];
  summary: string;
  score: number;
}

interface ImageItem {
  id: number;
  label: string;
  score: number;
  failures: { label: string; detail: string; severity?: 'critical' | 'major' | 'minor' }[];
  url?: string;
}

interface AiQuery {
  query: string;
  pass: boolean;
}

interface BriefField {
  label: string;
  value: string;
}

// ── Demo data ─────────────────────────────────────────────────────
const AGENTS: Agent[] = [
  {
    id: 'visual',
    title: 'Visual auditor',
    lines: [
      'Loading listing images…',
      'Sending to vision model…',
      'Scoring hero image — mobile readability…',
      'Checking infographic hierarchy…',
      'Analysing lifestyle context…',
      'Evaluating text density on mobile…',
      'Cross-checking against best-practice templates…',
    ],
    summary: '7 images scored. 3 critical failures found.',
    score: 58,
  },
  {
    id: 'reviews',
    title: 'Review intelligence',
    lines: [
      'Reading customer reviews…',
      'Extracting purchase triggers…',
      'Mapping review language to image gaps…',
      'Finding image gaps…',
      'Scoring sentiment against visual claims…',
    ],
    summary: '42 reviews analysed. 2 image gaps identified.',
    score: 71,
  },
  {
    id: 'ai-search',
    title: 'AI search visibility',
    lines: [
      'Querying Claude with shopper questions…',
      'Querying Gemini…',
      'Checking brand visibility in responses…',
      'Testing 4 additional query variants…',
      'Scoring mention frequency…',
    ],
    summary: 'Product missing from 4 of 6 AI search results.',
    score: 44,
  },
  {
    id: 'benchmark',
    title: 'Category benchmarker',
    lines: [
      'Finding top competitors for your keyword…',
      'Pulling competitor hero images…',
      'Running visual comparison…',
      'Scoring gap opportunities…',
    ],
    summary: 'Benchmarked against 5 competitors. 1 visual gap found.',
    score: 79,
  },
];

const AGENT_INDEX: Record<string, number> = { visual: 0, review: 1, search: 2, benchmark: 3 };

const IMAGES: ImageItem[] = [
  {
    id: 1, label: 'Hero image', score: 48,
    failures: [
      { label: 'Text too small on mobile', detail: '11 words of 8px text are illegible on a 375px screen.', severity: 'critical' },
      { label: 'No focal point in first 3 seconds', detail: 'Eye-tracking patterns show no clear anchor.', severity: 'major' },
    ],
  },
  {
    id: 2, label: 'Lifestyle shot', score: 74,
    failures: [
      { label: 'Background competes with product', detail: 'High-contrast props draw attention away from the item.', severity: 'major' },
    ],
  },
  {
    id: 3, label: 'Infographic 1', score: 52,
    failures: [
      { label: 'Hierarchy unclear', detail: 'Three competing headline sizes create confusion.', severity: 'critical' },
      { label: 'Benefit buried in paragraph 3', detail: 'Key differentiator is on the 6th line of copy.', severity: 'major' },
    ],
  },
  { id: 4, label: 'Infographic 2', score: 81, failures: [] },
  {
    id: 5, label: 'Size chart', score: 66,
    failures: [
      { label: 'Font size below 12px', detail: 'Measurement values unreadable without zoom.', severity: 'minor' },
    ],
  },
];

const AI_QUERIES: AiQuery[] = [
  { query: 'best ergonomic desk mat for remote work', pass: false },
  { query: 'large desk pad with wireless charging', pass: true },
  { query: 'premium desk mat under $50', pass: false },
  { query: 'non-slip desk mat for keyboard and mouse', pass: false },
  { query: 'desk setup accessories 2025', pass: true },
  { query: 'waterproof desk mat review', pass: false },
];

const BRIEF_FIELDS: BriefField[] = [
  { label: 'Product category', value: 'Premium desk accessories — ergonomic workspace' },
  { label: 'Target customer', value: 'Remote workers, 28–42, investing in home-office quality' },
  { label: 'Visual style direction', value: 'Clean, minimal, premium — white backgrounds, precise margins, no lifestyle clutter' },
  { label: 'Hero shot recommendation', value: 'Full-bleed product on white with a single bold callout: the primary differentiator in 5 words or fewer' },
  { label: 'Infographic priorities', value: '1. Non-slip base detail shot  2. Wireless charging zone diagram  3. Dimensions with human-scale reference' },
  { label: 'Trust signals to include', value: 'Materials certification, 18-month warranty badge, exact measurements (not "XL")' },
  { label: 'Mobile optimisation notes', value: 'Max 6 words per callout. Min 16px text on all images. Test every frame at 375px before upload.' },
  { label: 'AI search keywords to feature', value: '"non-slip", "wireless charging", "waterproof", "ergonomic", "remote work"' },
  { label: "What competitors aren't doing", value: 'No competitor shows a split-view of the surface texture. First to show material closeup wins the tactile buyer.' },
];

const DEMO_SCORE = 63;

// ── Utilities ─────────────────────────────────────────────────────
function scoreColor(s: number) {
  if (s >= 75) return 'var(--score-high)';
  if (s >= 45) return 'var(--score-mid)';
  return 'var(--score-low)';
}

function scoreGrade(s: number) {
  if (s >= 90) return 'A+';
  if (s >= 80) return 'A';
  if (s >= 70) return 'B';
  if (s >= 60) return 'C+';
  if (s >= 50) return 'C';
  if (s >= 40) return 'D';
  return 'F';
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function twoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches) return text;
  return matches.slice(0, 2).join(' ').trim();
}

function useAnimatedCount(target: number, duration = 800, active = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!active) { setVal(0); return; }
    let startTs: number | null = null;
    const step = (ts: number) => {
      if (!startTs) startTs = ts;
      const prog = Math.min((ts - startTs) / duration, 1);
      setVal(Math.round(easeOutCubic(prog) * target));
      if (prog < 1) requestAnimationFrame(step);
    };
    const raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, active, duration]);
  return val;
}

// ── Sub-components ────────────────────────────────────────────────
function PulsingDot({ color = '#15803d', size = 10 }: { color?: string; size?: number }) {
  return (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      borderRadius: '50%',
      background: color,
      flexShrink: 0,
      boxShadow: `0 0 0 3px ${color}33`,
      animation: 'pulse-green 1.2s ease infinite',
    }} />
  );
}

function StatusDot({ state }: { state: AgentState }) {
  if (state === 'complete') {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="10" cy="10" r="10" fill="#16a34a" />
        <path d="M6 10l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (state === 'running') return <PulsingDot color="#15803d" size={10} />;
  return (
    <span style={{
      display: 'inline-block',
      width: 10,
      height: 10,
      borderRadius: '50%',
      background: 'var(--border)',
      flexShrink: 0,
    }} />
  );
}

function AgentCard({
  agent, state, streamedLines, visible, delay, summary, elapsed,
}: {
  agent: Agent;
  state: AgentState;
  streamedLines: string[];
  visible: boolean;
  delay: number;
  summary?: string;
  elapsed?: number;
}) {
  const isRunning = state === 'running';
  const isComplete = state === 'complete';
  const isWaiting = state === 'waiting';

  return (
    <div style={{
      background: isComplete ? 'rgba(22,163,74,0.06)' : 'var(--white)',
      borderTop: `1px solid ${isRunning ? 'rgba(17,17,16,0.15)' : isComplete ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`,
      borderRight: `1px solid ${isRunning ? 'rgba(17,17,16,0.15)' : isComplete ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`,
      borderBottom: `1px solid ${isRunning ? 'rgba(17,17,16,0.15)' : isComplete ? 'rgba(22,163,74,0.3)' : 'var(--border)'}`,
      borderLeft: isRunning ? '3px solid #111110' : isComplete ? '3px solid #16a34a' : '3px solid var(--border)',
      borderRadius: 12,
      padding: '24px 28px',
      transition: 'border-color 250ms ease, background 250ms ease, box-shadow 250ms ease',
      boxShadow: isRunning ? '0 2px 12px rgba(0,0,0,0.045)' : 'none',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(12px)',
      transitionProperty: 'opacity, transform, border-color, background, box-shadow',
      transitionDuration: '500ms, 500ms, 250ms, 250ms, 250ms',
      transitionDelay: `${delay}ms, ${delay}ms, 0ms, 0ms, 0ms`,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        <div style={{ paddingTop: 4 }}>
          <StatusDot state={state} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 15,
            fontWeight: isWaiting ? 400 : 600,
            color: isWaiting ? 'var(--text-secondary)' : 'var(--text-primary)',
            marginBottom: 8,
            letterSpacing: '-0.02em',
          }}>
            {agent.title}
          </div>
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 13,
            lineHeight: 1.7,
            minHeight: 22,
          }}>
            {isWaiting && (
              <span style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-dm-sans)', fontSize: 13 }}>Queued</span>
            )}
            {isRunning && streamedLines.map((line, i) => (
              <div key={i} style={{
                color: i < streamedLines.length - 1 ? 'rgba(107,106,103,0.45)' : 'var(--text-secondary)',
                transition: 'color 300ms ease',
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
              }}>
                <span style={{
                  color: i < streamedLines.length - 1 ? 'rgba(107,106,103,0.3)' : 'var(--text-tertiary)',
                  fontSize: 11,
                  lineHeight: 1,
                  flexShrink: 0,
                }}>›</span>
                {line}
              </div>
            ))}
            {isComplete && (
              <span style={{
                color: 'var(--score-high)',
                fontWeight: 500,
                fontSize: 13,
              }}>
                {summary ?? agent.summary}
              </span>
            )}
          </div>
        </div>
        {isRunning && elapsed !== undefined && elapsed > 0 && (
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 12,
            color: 'var(--text-tertiary)',
            flexShrink: 0,
            paddingTop: 2,
          }}>
            {elapsed}s
          </div>
        )}
        {isComplete && (
          <div style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 15,
            fontWeight: 600,
            color: scoreColor(agent.score),
            flexShrink: 0,
            letterSpacing: '-0.02em',
          }}>
            {agent.score}
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreBar({ scores, animate }: { scores: number[]; animate: boolean }) {
  const labels = ['Images', 'Reviews', 'AI search', 'Competition'];
  const total = scores.reduce((a, b) => a + b, 0);
  const widths = scores.map(s => (s / total) * 100);

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', height: 10, gap: 2, marginBottom: 12 }}>
        {widths.map((w, i) => (
          <div key={i} style={{
            height: '100%',
            background: scoreColor(scores[i]),
            borderRadius: 3,
            width: animate ? `${w}%` : '0%',
            transition: `width 600ms cubic-bezier(0.16,1,0.3,1) ${100 * i + 200}ms`,
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {labels.map((label, i) => (
          <div key={i} style={{
            flex: widths[i] / 100,
            fontFamily: 'var(--font-dm-sans)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', letterSpacing: '0.02em', marginBottom: 1 }}>
              {label}
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: scoreColor(scores[i]), fontFamily: 'var(--font-jetbrains-mono)', letterSpacing: '-0.01em' }}>
              {scores[i]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      marginBottom: 20,
    }}>
      <span style={{
        fontFamily: 'var(--font-jetbrains-mono)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.20em',
        textTransform: 'uppercase',
        color: '#a8a7a3',
      }}>
        {children}
      </span>
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M7 1L8.5 5.5L13 7L8.5 8.5L7 13L5.5 8.5L1 7L5.5 5.5L7 1Z" stroke="var(--text-secondary)" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function ImageCard({ img }: { img: ImageItem }) {
  function severityDotColor(sev?: 'critical' | 'major' | 'minor') {
    if (sev === 'critical') return '#dc2626';
    if (sev === 'major') return '#d97706';
    return '#a8a7a3';
  }
  function severityLabel(sev?: 'critical' | 'major' | 'minor') {
    if (sev === 'critical') return 'Critical';
    if (sev === 'major') return 'Major';
    return 'Minor';
  }

  return (
    <div style={{ display: 'flex', gap: 20, padding: '20px 0', borderBottom: '1px solid var(--border)' }}>
      {/* Thumbnail */}
      <div style={{
        width: 96, height: 96, borderRadius: 10, background: 'var(--surface)',
        flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        {img.url ? (
          <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={img.label} />
        ) : (
          <svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`stripe-${img.id}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#e8e6e2" strokeWidth="4" />
              </pattern>
            </defs>
            <rect width="96" height="96" fill={`url(#stripe-${img.id})`} />
            <text x="48" y="52" textAnchor="middle" fontSize="9" fill="#a8a7a3" fontFamily="monospace">img {img.id}</text>
          </svg>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Header row: label + score */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {img.label}
          </span>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 14, fontWeight: 600, color: scoreColor(img.score), letterSpacing: '-0.02em' }}>
            {img.score}
          </span>
        </div>

        {/* Failures */}
        {img.failures.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--score-high)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)', fontFamily: 'var(--font-dm-sans)' }}>No critical issues found</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {img.failures.map((f, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                {/* Severity dot */}
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: severityDotColor(f.severity),
                  display: 'inline-block', flexShrink: 0, marginTop: 5,
                }} />
                <div>
                  {/* Severity badge + failure label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontFamily: 'var(--font-dm-sans)',
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: severityDotColor(f.severity),
                    }}>
                      {severityLabel(f.severity)}
                    </span>
                    <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>
                      {f.label}
                    </span>
                  </div>
                  {/* Detail — second visual level */}
                  <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: '#a8a7a3', lineHeight: 1.55, marginTop: 2 }}>
                    {f.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────
export default function HomeClient() {
  const [url, setUrl] = useState('https://www.amazon.com/dp/B0FJN3BTPV');
  const [urlError, setUrlError] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [agentStates, setAgentStates] = useState<AgentState[]>(['waiting', 'waiting', 'waiting', 'waiting']);
  const [streamedLines, setStreamedLines] = useState<string[][]>([[], [], [], []]);
  const [agentsDoneCount, setAgentsDoneCount] = useState(0);
  const [dashVisible, setDashVisible] = useState(false);
  const [cardsVisible, setCardsVisible] = useState([false, false, false, false]);
  const [synthState, setSynthState] = useState<SynthState>('hidden');
  const [reportVisible, setReportVisible] = useState(false);
  const [scoreAnimate, setScoreAnimate] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [agentSummaries, setAgentSummaries] = useState(['', '', '', '']);
  const [apiError, setApiError] = useState('');
  const [agentElapsed, setAgentElapsed] = useState([0, 0, 0, 0]);
  const agentStartTimes = useRef<Array<number | null>>([null, null, null, null]);
  const [resultPayload, setResultPayload] = useState<CachedResult | null>(null);

  const animatedScore = useAnimatedCount(resultPayload?.report?.overallScore ?? DEMO_SCORE, 800, scoreAnimate);

  const STATUS_MESSAGES = [
    'Analysing hero image quality…',
    'Reading customer review patterns…',
    'Querying AI search engines…',
    'Running competitor visual analysis…',
    'Synthesising cross-agent signals…',
  ];
  const statusRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const typingRefs = useRef<Array<{ cancel: () => void } | null>>([null, null, null, null]);

  useEffect(() => {
    if (phase !== 'running') return;
    setStatusText(STATUS_MESSAGES[0]);
    const interval = setInterval(() => {
      statusRef.current = (statusRef.current + 1) % STATUS_MESSAGES.length;
      setStatusText(STATUS_MESSAGES[statusRef.current]);
    }, 2800);
    return () => clearInterval(interval);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    const interval = setInterval(() => {
      const now = Date.now();
      setAgentElapsed(agentStartTimes.current.map(t => t !== null ? Math.floor((now - t) / 1000) : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [phase]);

  const handleSubmit = useCallback(() => {
    const trimmed = url.trim();
    if (!trimmed.toLowerCase().includes('amazon.')) {
      setUrlError("That doesn't look like an Amazon listing URL.");
      return;
    }
    setUrlError('');
    setApiError('');
    runAnalysis();
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  function animateLine(agentIdx: number, line: string) {
    typingRefs.current[agentIdx]?.cancel();
    let cancelled = false;
    let charIdx = 0;
    let tid: ReturnType<typeof setTimeout>;

    setStreamedLines(prev => {
      const n = prev.map(a => [...a]);
      n[agentIdx] = [...n[agentIdx], ''];
      return n;
    });

    const step = () => {
      if (cancelled) return;
      if (charIdx >= line.length) { typingRefs.current[agentIdx] = null; return; }
      setStreamedLines(prev => {
        const n = prev.map(a => [...a]);
        if (n[agentIdx].length === 0) return n;
        const lines = [...n[agentIdx]];
        lines[lines.length - 1] = line.substring(0, charIdx + 1);
        n[agentIdx] = lines;
        return n;
      });
      charIdx++;
      tid = setTimeout(step, 30 + Math.random() * 20);
    };

    typingRefs.current[agentIdx] = {
      cancel: () => {
        cancelled = true;
        clearTimeout(tid);
        setStreamedLines(prev => {
          const n = prev.map(a => [...a]);
          if (n[agentIdx].length > 0) {
            const lines = [...n[agentIdx]];
            lines[lines.length - 1] = line;
            n[agentIdx] = lines;
          }
          return n;
        });
      },
    };

    step();
  }

  async function runAnalysis() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPhase('running');
    setAgentsDoneCount(0);
    setSynthState('hidden');
    setReportVisible(false);
    setScoreAnimate(false);
    setAgentStates(['waiting', 'waiting', 'waiting', 'waiting']);
    setStreamedLines([[], [], [], []]);
    setCardsVisible([false, false, false, false]);
    setDashVisible(false);
    setAgentSummaries(['', '', '', '']);
    setAgentElapsed([0, 0, 0, 0]);
    setResultPayload(null);
    typingRefs.current = [null, null, null, null];
    agentStartTimes.current = [null, null, null, null];
    statusRef.current = 0;

    setTimeout(() => setDashVisible(true), 100);
    ([0, 1, 2, 3] as const).forEach(i => {
      setTimeout(() => {
        setCardsVisible(prev => { const n = [...prev]; n[i] = true; return n; });
      }, 300 + i * 80);
    });

    try {
      const res = await fetch('/api/analyse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setApiError(data.error ?? 'Something went wrong.');
        setPhase('idle');
        return;
      }

      const reader = res.body!.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let isSynthDone = false;

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n');
        buf = parts.pop() ?? '';

        for (const part of parts) {
          if (!part.startsWith('data: ')) continue;
          let ev: Record<string, unknown>;
          try { ev = JSON.parse(part.slice(6)); } catch { continue; }

          if (ev.type === 'error') {
            setApiError((ev.message as string) ?? 'Analysis failed.');
            setPhase('idle');
            break outer;
          }

          if (ev.type === 'complete') {
            if (ev.payload) {
              setResultPayload(ev.payload as CachedResult);
            }
            setPhase('complete');
            if (!isSynthDone) {
              setAgentStates(['complete', 'complete', 'complete', 'complete']);
              setAgentSummaries(AGENTS.map(a => a.summary));
              setSynthState('done');
              setTimeout(() => { setReportVisible(true); setTimeout(() => setScoreAnimate(true), 300); }, 600);
            }
            break outer;
          }

          if (ev.agent === 'synthesis') {
            if (ev.status === 'running') setSynthState('synth');
            if (ev.status === 'complete') {
              setSynthState('done');
              isSynthDone = true;
              setTimeout(() => { setReportVisible(true); setTimeout(() => setScoreAnimate(true), 300); }, 600);
            }
            continue;
          }

          const idx = AGENT_INDEX[ev.agent as string];
          if (idx === undefined) continue;

          if (ev.status === 'running') {
            if (agentStartTimes.current[idx] === null) {
              agentStartTimes.current[idx] = Date.now();
            }
            setAgentStates(prev => { const n = [...prev]; n[idx] = 'running'; return n; });
            animateLine(idx, ev.message as string);
          } else if (ev.status === 'complete' || ev.status === 'failed') {
            agentStartTimes.current[idx] = null;
            typingRefs.current[idx]?.cancel();
            typingRefs.current[idx] = null;
            setAgentStates(prev => { const n = [...prev]; n[idx] = 'complete'; return n; });
            setAgentSummaries(prev => {
              const n = [...prev];
              n[idx] = ((ev.summary ?? ev.message ?? '') as string);
              return n;
            });
            setAgentsDoneCount(prev => prev + 1);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setApiError('Connection error. Please try again.');
      setPhase('idle');
    }
  }

  const heroStyle = (delay: number): React.CSSProperties => ({
    opacity: 0,
    animation: `fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1) ${delay}ms forwards`,
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />

      <main style={{ flex: 1, padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>

          {/* ── Hero ── */}
          <section style={{ textAlign: 'center', padding: '80px 0 64px', position: 'relative' }}>
            <div style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100vw',
              backgroundImage: [
                'repeating-linear-gradient(0deg, rgba(0,0,0,0.045) 0px, rgba(0,0,0,0.045) 1px, transparent 1px, transparent 40px)',
                'repeating-linear-gradient(60deg, rgba(0,0,0,0.045) 0px, rgba(0,0,0,0.045) 1px, transparent 1px, transparent 40px)',
                'repeating-linear-gradient(120deg, rgba(0,0,0,0.045) 0px, rgba(0,0,0,0.045) 1px, transparent 1px, transparent 40px)',
              ].join(', '),
              WebkitMaskImage: [
                'linear-gradient(to bottom, black 55%, rgba(0,0,0,0.3) 80%, transparent 100%)',
                'radial-gradient(ellipse 55% 60% at 50% 42%, transparent 0%, transparent 38%, black 68%)',
              ].join(', '),
              WebkitMaskComposite: 'destination-in',
              maskImage: [
                'linear-gradient(to bottom, black 55%, rgba(0,0,0,0.3) 80%, transparent 100%)',
                'radial-gradient(ellipse 55% 60% at 50% 42%, transparent 0%, transparent 38%, black 68%)',
              ].join(', '),
              maskComposite: 'intersect',
              pointerEvents: 'none',
              zIndex: -1,
            }} />
            <div style={{ ...heroStyle(0), marginBottom: 16 }}>
              <span style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}>
                Amazon listing intelligence
              </span>
            </div>

            <h1 style={{
              ...heroStyle(60),
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 'clamp(32px, 5vw, 48px)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              lineHeight: 1.0,
              color: 'var(--text-primary)',
              marginBottom: 16,
            }}>
              Find out exactly why your<br />images aren't converting.
            </h1>

            <p style={{
              ...heroStyle(120),
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 17,
              lineHeight: 1.6,
              color: 'var(--text-secondary)',
              maxWidth: 520,
              margin: '0 auto 40px',
            }}>
              Paste your Amazon listing URL. Four AI agents analyse your images,
              benchmark your competitors, and check your AI search visibility — in 90 seconds.
            </p>

            {/* URL Input */}
            <div style={{ ...heroStyle(180), maxWidth: 600, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  type="text"
                  className="url-input"
                  value={url}
                  onChange={e => { setUrl(e.target.value); if (urlError) setUrlError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                  placeholder="https://www.amazon.com/dp/..."
                  style={{
                    flex: 1,
                    minWidth: 240,
                    height: 56,
                    background: 'var(--white)',
                    border: `1.5px solid ${urlError ? 'var(--score-low)' : 'var(--border)'}`,
                    borderRadius: 12,
                    padding: '0 20px',
                    fontFamily: 'var(--font-jetbrains-mono)',
                    fontSize: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'border-color 200ms, box-shadow 200ms',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = urlError ? 'var(--score-low)' : '#111110';
                    e.currentTarget.style.boxShadow = '0 0 0 4px rgba(17,17,16,0.06)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = urlError ? 'var(--score-low)' : 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                <button
                  onClick={handleSubmit}
                  style={{
                    height: 56,
                    padding: '0 28px',
                    background: '#111110',
                    color: '#fff',
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 14,
                    fontWeight: 500,
                    border: 'none',
                    borderRadius: 12,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'background 150ms, transform 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#2d2d2d'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#111110'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  onMouseDown={e => { e.currentTarget.style.background = '#111110'; e.currentTarget.style.transform = 'translateY(0) scale(0.98)'; }}
                  onMouseUp={e => { e.currentTarget.style.background = '#2d2d2d'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                >
                  Analyse listing
                </button>
              </div>

              {(urlError || apiError) && (
                <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--score-low)', marginTop: 8, textAlign: 'left' }}>
                  {urlError || apiError}
                </div>
              )}

              <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 12, textAlign: 'center' }}>
                No account needed. Free. Results in ~90 seconds.
              </div>
            </div>
          </section>

          {/* ── Agent Dashboard ── */}
          {phase !== 'idle' && (
            <section style={{
              opacity: dashVisible ? 1 : 0,
              transform: dashVisible ? 'translateY(0)' : 'translateY(24px)',
              transition: 'opacity 400ms ease-out, transform 400ms ease-out',
              marginBottom: 48,
            }}>
              <div style={{ marginBottom: 20 }}>
                <SectionLabel>Agents running</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                  {phase === 'running' && <PulsingDot color="#16a34a" size={6} />}
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {statusText}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {AGENTS.map((agent, i) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    state={agentStates[i]}
                    streamedLines={streamedLines[i]}
                    visible={cardsVisible[i]}
                    delay={0}
                    summary={agentSummaries[i] || undefined}
                    elapsed={agentElapsed[i]}
                  />
                ))}
              </div>

              {synthState !== 'hidden' && (
                <div style={{
                  background: 'var(--surface)',
                  borderRadius: 10,
                  padding: '16px 20px',
                  marginTop: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  opacity: 1,
                  transition: 'opacity 400ms ease',
                }}>
                  <SparkIcon />
                  <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)' }}>
                    {synthState === 'synth'
                      ? 'Synthesising findings across all agents…'
                      : 'Analysis complete. Generating your report.'}
                  </span>
                </div>
              )}
            </section>
          )}

          {/* ── Report ── */}
          {reportVisible && (
            <div style={{ opacity: 1, animation: 'fadeSlideUp 500ms ease forwards' }}>

              {/* 1. Overall Score */}
              <section style={{ textAlign: 'center', padding: '40px 0 36px' }}>
                {/* Score + grade row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 12 }}>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 80,
                    fontWeight: 700,
                    letterSpacing: '-0.05em',
                    lineHeight: 1,
                    color: scoreColor(animatedScore),
                    transition: 'color 300ms ease',
                  }}>
                    {animatedScore}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 40,
                    fontWeight: 300,
                    color: 'var(--border)',
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                    margin: '0 10px',
                    userSelect: 'none',
                  }}>/</span>
                  <span style={{
                    fontFamily: 'var(--font-dm-sans)',
                    fontSize: 48,
                    fontWeight: 700,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    color: scoreColor(resultPayload?.report?.overallScore ?? DEMO_SCORE),
                  }}>
                    {scoreGrade(resultPayload?.report?.overallScore ?? DEMO_SCORE)}
                  </span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-dm-sans)',
                  fontSize: 17,
                  color: 'var(--text-primary)',
                  maxWidth: 480,
                  margin: '0 auto 32px',
                  lineHeight: 1.55,
                  fontWeight: 400,
                }}>
                  {twoSentences(resultPayload?.report?.verdict ?? "Strong hero image. Infographics are costing you conversions on mobile.")}
                </p>
                <ScoreBar
                  scores={AGENTS.map(a => a.score)}
                  animate={scoreAnimate}
                />
              </section>

              {/* 2. Image analysis */}
              <section style={{ marginTop: 64, marginBottom: 72, opacity: 0, animation: 'fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1) 200ms forwards' }}>
                <SectionLabel>Image analysis</SectionLabel>
                <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '0 24px' }}>
                  {resultPayload?.visual?.images?.length ? (
                    resultPayload.visual.images.map(img => (
                      <ImageCard key={img.index} img={{
                        id: img.index,
                        label: `Image ${img.index}`,
                        score: img.score,
                        failures: img.failures.map(f => ({ label: f.lever, detail: f.description, severity: f.severity })),
                        url: resultPayload.product?.images?.[img.index]
                      }} />
                    ))
                  ) : resultPayload?.product?.images?.length ? (
                    resultPayload.product.images.slice(0, 7).map((url, i) => (
                      <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: i < Math.min(resultPayload.product.images.length, 7) - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ width: 80, height: 80, borderRadius: 8, flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={`Image ${i + 1}`} />
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: 'var(--text-tertiary)' }}>
                            Image {i + 1} — analysis unavailable
                          </span>
                        </div>
                      </div>
                    ))
                  ) : null}
                </div>
              </section>

              {/* 3. Biggest conversion leak */}
              <section style={{ background: 'var(--surface)', border: '1px solid rgba(220,38,38,0.12)', borderRadius: 16, padding: '32px 32px 36px', marginTop: 64, marginBottom: 72, opacity: 0, animation: 'fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1) 280ms forwards' }}>
                <SectionLabel>Conversion analysis</SectionLabel>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(220,38,38,0.1)', flexShrink: 0 }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M7 1L13 13H1L7 1Z" stroke="var(--score-low)" strokeWidth="1.5" strokeLinejoin="round" />
                        <path d="M7 5.5V8" stroke="var(--score-low)" strokeWidth="1.5" strokeLinecap="round" />
                        <circle cx="7" cy="10.5" r="0.75" fill="var(--score-low)" />
                      </svg>
                    </span>
                    <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: 0 }}>
                      Your biggest conversion leak
                    </h2>
                  </div>
                  <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    This single image issue is your highest-impact fix. Address it first.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
                  <div>
                    <div style={{ background: 'var(--border)', borderRadius: 10, aspectRatio: '1/1', position: 'relative', overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(220,38,38,0.2)' }}>
                      {resultPayload?.product?.images?.[resultPayload.report?.biggestLeak?.imageIndex ?? 0] ? (
                        <img 
                          src={resultPayload.product.images[resultPayload.report?.biggestLeak?.imageIndex ?? 0]} 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                          alt="Biggest leak" 
                        />
                      ) : (
                        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <pattern id="hero-stripe" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                              <line x1="0" y1="0" x2="0" y2="10" stroke="#e8e6e2" strokeWidth="5" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill="url(#hero-stripe)" />
                        </svg>
                      )}
                      {/* Red dashed callout box over problem area */}
                      <div style={{
                        position: 'absolute',
                        bottom: '12%',
                        left: '8%',
                        right: '8%',
                        top: '30%',
                        border: '2px dashed rgba(220,38,38,0.85)',
                        borderRadius: 6,
                        pointerEvents: 'none',
                      }} />
                      {/* Callout label pinned to top of the dashed box */}
                      <div style={{
                        position: 'absolute',
                        top: 'calc(30% - 14px)',
                        left: '8%',
                        background: 'rgba(220,38,38,0.93)',
                        borderRadius: '4px 4px 4px 0',
                        padding: '3px 8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        backdropFilter: 'blur(4px)',
                      }}>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 1L9 9H1L5 1Z" fill="white" />
                        </svg>
                        <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap' }}>
                          {resultPayload?.report?.biggestLeak?.description ?? 'Text unreadable at 375px'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(220,38,38,0.08)', borderRadius: 6, padding: '3px 10px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--score-low)', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: 'var(--score-low)', fontFamily: 'var(--font-dm-sans)', fontWeight: 500 }}>Problem area</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, marginBottom: 10 }}>
                      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, letterSpacing: '-0.01em' }}>
                        How to fix it
                      </div>
                      <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                        {resultPayload?.report?.biggestLeak?.prescription ?? "Lead with the product\u2019s primary benefit in 5 words or fewer \u2014 large enough to read on a 375px thumbnail without pinching. Remove the secondary callout entirely; it fragments attention. Replace with a single high-contrast badge in the upper-right corner."}
                      </p>
                    </div>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(22,163,74,0.08)', borderRadius: 6, padding: '3px 10px' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--score-high)', display: 'inline-block' }} />
                      <span style={{ fontSize: 12, color: 'var(--score-high)', fontFamily: 'var(--font-dm-sans)', fontWeight: 500 }}>Recommended fix</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 4. Competitor comparison */}
              <section style={{ background: 'var(--surface)', borderRadius: 16, padding: '32px 32px 36px', marginTop: 64, marginBottom: 72, opacity: 0, animation: 'fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1) 360ms forwards' }}>
                <SectionLabel>Competitor comparison</SectionLabel>
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 8px' }}>
                    How you compare
                  </h2>
                  <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    The top-ranked competitor for your keyword, side by side.
                  </p>
                </div>
                <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                    {(['Your image', 'Top competitor'] as const).map((label, i) => {
                      const imgUrl = i === 0 
                        ? resultPayload?.product?.images?.[0]
                        : resultPayload?.benchmark?.visualStrategies?.[0]?.thumbnailUrl;
                      
                      const fallbackText = i === 0 ? 'Text-heavy hero. Benefit unclear in 2 seconds.' : 'Full-bleed product, one bold stat, zero clutter.';
                      
                      const descText = i === 0
                        ? (resultPayload?.visual?.images?.[0]?.failures?.[0]?.description ?? fallbackText)
                        : (resultPayload?.benchmark?.visualStrategies?.[0]?.strategy ?? fallbackText);

                      const isYours = i === 0;

                      return (
                        <div key={i}>
                          {/* Image frame */}
                          <div style={{ aspectRatio: '1/1', background: 'var(--surface)', borderRadius: 10, marginBottom: 10, border: `1.5px solid ${isYours ? 'rgba(220,38,38,0.25)' : 'rgba(22,163,74,0.25)'}`, overflow: 'hidden', position: 'relative' }}>
                            {imgUrl ? (
                              <img src={i === 0 ? imgUrl : `/api/proxy-image?url=${encodeURIComponent(imgUrl)}`} alt={label} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            ) : (
                              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                <defs>
                                  <pattern id={`comp-stripe-${i}`} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                                    <line x1="0" y1="0" x2="0" y2="10" stroke="#e8e6e2" strokeWidth="5" />
                                  </pattern>
                                </defs>
                                <rect width="100%" height="100%" fill={`url(#comp-stripe-${i})`} />
                              </svg>
                            )}
                          </div>
                          {/* Label pill */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: isYours ? 'rgba(220,38,38,0.08)' : 'rgba(22,163,74,0.08)',
                              border: `1px solid ${isYours ? 'rgba(220,38,38,0.2)' : 'rgba(22,163,74,0.2)'}`,
                              borderRadius: 20,
                              padding: '3px 10px',
                            }}>
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: isYours ? 'var(--score-low)' : 'var(--score-high)', display: 'inline-block', flexShrink: 0 }} />
                              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 600, color: isYours ? 'var(--score-low)' : 'var(--score-high)' }}>
                                {label}
                              </span>
                            </span>
                          </div>
                          <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                            {descText}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                    {resultPayload?.benchmark?.gapAnalysis ?? "The top competitor leads with a single product stat at 48px. Your hero uses 4 callouts at 12px. On mobile, none of yours are legible \u2014 their single callout is. That gap explains a significant portion of the click-through rate difference."}
                  </div>
                </div>
              </section>

              {/* 5. AI search visibility */}
              <section style={{ marginTop: 64, marginBottom: 72, opacity: 0, animation: 'fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1) 440ms forwards' }}>
                <SectionLabel>AI search visibility</SectionLabel>

                {/* Visibility score summary */}
                {(() => {
                  const queries = resultPayload?.search?.queries?.map(q => ({
                    query: q.question,
                    pass: q.claudeFound || q.geminiFound,
                  })) ?? AI_QUERIES;
                  const passCount = queries.filter(q => q.pass).length;
                  const total = queries.length;
                  const pct = Math.round((passCount / total) * 100);
                  const isWeak = passCount <= total / 2;

                  return (
                    <>
                      {/* Summary header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: isWeak ? 'rgba(220,38,38,0.04)' : 'rgba(22,163,74,0.04)',
                        border: `1px solid ${isWeak ? 'rgba(220,38,38,0.15)' : 'rgba(22,163,74,0.15)'}`,
                        borderRadius: '12px 12px 0 0',
                        padding: '18px 24px',
                        borderBottom: 'none',
                      }}>
                        <div>
                          <div style={{
                            fontFamily: 'var(--font-dm-sans)',
                            fontSize: 22,
                            fontWeight: 700,
                            letterSpacing: '-0.03em',
                            color: isWeak ? 'var(--score-low)' : 'var(--score-high)',
                            lineHeight: 1,
                            marginBottom: 4,
                          }}>
                            {passCount}/{total} <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', letterSpacing: 0 }}>AI queries found your product</span>
                          </div>
                          <div style={{
                            fontFamily: 'var(--font-dm-sans)',
                            fontSize: 13,
                            color: 'var(--text-tertiary)',
                          }}>
                            {isWeak
                              ? `Your product is invisible in ${total - passCount} of ${total} high-intent AI searches`
                              : `Good visibility — appearing in ${passCount} of ${total} tested queries`}
                          </div>
                        </div>
                        {/* Mini donut-style percentage */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{
                            fontFamily: 'var(--font-jetbrains-mono)',
                            fontSize: 28,
                            fontWeight: 700,
                            letterSpacing: '-0.04em',
                            color: isWeak ? 'var(--score-low)' : 'var(--score-high)',
                            lineHeight: 1,
                          }}>
                            {pct}%
                          </div>
                          <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
                            visibility
                          </div>
                        </div>
                      </div>

                      {/* Query rows */}
                      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderTop: 'none', borderRadius: '0 0 12px 12px', overflow: 'hidden' }}>
                        {queries.map((q, i) => (
                          <div key={i} style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 14,
                            padding: '18px 24px',
                            borderBottom: i < queries.length - 1 ? '1px solid var(--border)' : 'none',
                            background: !q.pass ? 'rgba(220,38,38,0.015)' : 'transparent',
                          }}>
                            {/* Status dot */}
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%',
                              background: q.pass ? 'var(--score-high)' : 'var(--score-low)',
                              flexShrink: 0,
                            }} />
                            {/* Query text */}
                            <span style={{
                              fontFamily: 'var(--font-jetbrains-mono)',
                              fontSize: 13,
                              color: 'var(--text-primary)',
                              flex: 1,
                              lineHeight: 1.45,
                            }}>
                              {q.query}
                            </span>
                            {/* Badge */}
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              background: q.pass ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.1)',
                              border: `1px solid ${q.pass ? 'rgba(22,163,74,0.25)' : 'rgba(220,38,38,0.25)'}`,
                              borderRadius: 20,
                              padding: '4px 11px',
                              fontFamily: 'var(--font-dm-sans)',
                              fontSize: 12,
                              fontWeight: 600,
                              color: q.pass ? 'var(--score-high)' : 'var(--score-low)',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}>
                              {q.pass ? (
                                <>
                                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                    <path d="M1.5 4.5l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                  Appears
                                </>
                              ) : (
                                <>
                                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                                    <path d="M2 2l5 5M7 2L2 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                  </svg>
                                  Not found
                                </>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Tinted explanation box */}
                      <div style={{
                        marginTop: 16,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderLeft: '3px solid var(--text-primary)',
                        borderRadius: 10,
                        padding: '16px 20px',
                      }}>
                        <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 6 }}>
                          What this means
                        </div>
                        <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0 }}>
                          {resultPayload?.search?.missingKeywords?.length
                            ? `Your listing doesn't feature ${resultPayload.search.missingKeywords.map(k => `"${k}"`).join(', ')} prominently enough for AI assistants to surface it during high-intent queries. Adding these typically improves AI visibility.`
                            : 'Your listing doesn\'t feature "non-slip", "ergonomic", or "waterproof" prominently enough for AI assistants to surface it during high-intent queries. Adding these as bullet-point openers typically improves AI visibility within 1–2 weeks.'}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </section>

              {/* 6. Score card */}
              <div style={{ marginTop: 64 }}>
                <ScoreCard resultPayload={resultPayload} />
              </div>

              {/* 7. Pixii brief */}
              <section style={{ marginTop: 64, marginBottom: 72, opacity: 0, animation: 'fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1) 600ms forwards' }}>
                <SectionLabel>Design brief</SectionLabel>

                {/* Header row: title + buttons side by side */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: 'var(--text-primary)', margin: '0 0 6px' }}>
                      Your Pixii design brief
                    </h2>
                    <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                      Ready to paste into Pixii. Generated from everything the agents found.
                    </p>
                  </div>

                  {/* Buttons — prominent at the top */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <a
                      href="https://pixii.ai"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        height: 44,
                        padding: '0 20px',
                        background: '#111110',
                        border: 'none',
                        borderRadius: 8,
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 14,
                        fontWeight: 500,
                        color: '#fff',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'background 150ms ease, transform 150ms ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#2a2a28'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#111110'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      Open Pixii
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 9.5L9.5 2.5M9.5 2.5H4.5M9.5 2.5V7.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </a>
                    <button
                      onClick={() => {
                        const fields = resultPayload?.report?.pixiiBrief ? [
                          { label: 'Product category', value: resultPayload.report.pixiiBrief.productCategory },
                          { label: 'Target customer', value: resultPayload.report.pixiiBrief.targetCustomer },
                          { label: 'Visual style direction', value: resultPayload.report.pixiiBrief.visualDirection },
                          { label: 'Hero shot recommendation', value: resultPayload.report.pixiiBrief.heroRecommendation },
                          { label: 'Infographic priorities', value: resultPayload.report.pixiiBrief.infographicPriorities.join(', ') },
                          { label: 'Trust signals to include', value: resultPayload.report.pixiiBrief.trustSignals.join(', ') },
                          { label: 'Mobile optimisation notes', value: resultPayload.report.pixiiBrief.mobileNotes },
                          { label: 'AI search keywords to feature', value: resultPayload.report.pixiiBrief.searchKeywords.join(', ') },
                          { label: "What competitors aren't doing", value: resultPayload.report.pixiiBrief.competitorOpening },
                        ] : BRIEF_FIELDS;
                        const text = fields.map(f => `${f.label.toUpperCase()}\n${f.value}`).join('\n\n');
                        navigator.clipboard.writeText(text).catch(() => {});
                        setCopyState('copied');
                        setTimeout(() => setCopyState('idle'), 2000);
                      }}
                      style={{
                        height: 44,
                        padding: '0 20px',
                        background: 'transparent',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-dm-sans)',
                        fontSize: 14,
                        fontWeight: 500,
                        border: '1px solid var(--border)',
                        borderRadius: 8,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'background 150ms ease, transform 150ms ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      {copyState === 'copied' ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7l3.5 3.5L12 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <rect x="1" y="3" width="8" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M4 3V2.5A1.5 1.5 0 015.5 1h5A1.5 1.5 0 0112 2.5v7A1.5 1.5 0 0110.5 11H10" stroke="currentColor" strokeWidth="1.3" />
                          </svg>
                          Copy brief
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <PixiiBrief brief={resultPayload?.report?.pixiiBrief} />
              </section>

            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
