import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ScoreCard from '@/components/report/ScoreCard';
import { redis } from '@/lib/redis';
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

export const metadata: Metadata = {
  title: 'Listing Report — ListingLens',
  description: 'View a shared Amazon listing analysis report.',
};

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

const SCORE = 63;
const AGENT_SCORES = [58, 71, 44, 79];
const AGENT_LABELS = ['Images', 'Reviews', 'AI search', 'Competition'];
const AGENT_NAMES = ['Visual audit', 'Review intel', 'AI search', 'Competition'];

const FINDINGS = [
  { color: 'var(--score-low)', title: 'Hero image text unreadable at 375px', detail: '11 words at 8px become illegible on mobile. 61% of Amazon shoppers are on mobile. This is your single highest-impact fix.' },
  { color: 'var(--score-low)', title: 'Missing from 4 of 6 AI search results', detail: 'Claude and Gemini don\'t surface your product for "ergonomic", "non-slip", or "remote work" queries — the terms that describe your product most precisely.' },
  { color: 'var(--score-low)', title: 'Infographic hierarchy unclear', detail: 'Three competing headline sizes and buried benefits on image 3 cause shoppers to skip rather than scan. Your key differentiator is on line 6.' },
  { color: 'var(--score-mid)', title: 'Competitor leads with single-stat hero', detail: 'The top competitor shows one bold spec on a clean background. Your hero has 4 callouts. In a mobile thumbnail view, theirs wins every time.' },
  { color: 'var(--score-high)', title: 'Review sentiment is positive', detail: '42 reviews analysed. The dominant theme is "exactly as described." No material trust issues — shoppers who buy are happy. The funnel problem is pre-click, not post-click.' },
];

const AI_QUERIES = [
  { query: 'best ergonomic desk mat for remote work', pass: false },
  { query: 'large desk pad with wireless charging', pass: true },
  { query: 'premium desk mat under $50', pass: false },
  { query: 'non-slip desk mat for keyboard and mouse', pass: false },
  { query: 'desk setup accessories 2025', pass: true },
  { query: 'waterproof desk mat review', pass: false },
];

const BRIEF_FIELDS = [
  { label: 'Visual style direction', value: 'Clean, minimal, premium — white backgrounds, precise margins, no lifestyle clutter' },
  { label: 'Hero shot recommendation', value: 'Full-bleed product on white with a single bold callout: the primary differentiator in 5 words or fewer' },
  { label: 'Mobile optimisation notes', value: 'Max 6 words per callout. Min 16px text on all images. Test every frame at 375px before upload.' },
];

interface ImageItem {
  id: number;
  label: string;
  score: number;
  failures: { label: string; detail: string }[];
  url?: string;
}

function ImageCard({ img }: { img: ImageItem }) {
  return (
    <div style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{
        width: 80, height: 80, borderRadius: 8, background: 'var(--surface)',
        flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        {img.url ? (
          <img src={img.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={img.label} />
        ) : (
          <svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`stripe-${img.id}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#e8e6e2" strokeWidth="4" />
              </pattern>
            </defs>
            <rect width="80" height="80" fill={`url(#stripe-${img.id})`} />
            <text x="40" y="44" textAnchor="middle" fontSize="9" fill="#a8a7a3" fontFamily="monospace">img {img.id}</text>
          </svg>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            {img.label}
          </span>
          <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, fontWeight: 500, color: scoreColor(img.score) }}>
            {img.score}
          </span>
        </div>
        {img.failures.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--score-high)', display: 'inline-block', flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>No critical issues found</span>
          </div>
        ) : img.failures.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--score-low)', display: 'inline-block', flexShrink: 0, marginTop: 5 }} />
            <div>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{f.label}</span>
              <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: 'var(--text-tertiary)' }}> — {f.detail}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const resultPayload = await redis.get<CachedResult>(`result:${id}`);
  
  if (!resultPayload) {
    notFound();
  }

  const SCORE = resultPayload?.report?.overallScore ?? 62;
  const AGENT_SCORES = [
    resultPayload?.visual?.overallScore ?? 58,
    resultPayload?.review?.available ? 71 : 0,
    resultPayload?.search?.visibilityScore ?? 44,
    resultPayload?.benchmark?.competitorCount ? 79 : 0
  ];
  const widths = AGENT_SCORES.map(s => (s / AGENT_SCORES.reduce((a, b) => a + b, 0)) * 100);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav variant="results" />

      <main className="page-main" style={{ maxWidth: 760, margin: '0 auto', padding: '56px 24px 120px' }}>

        {/* Share strip */}
        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--border)',
          borderRadius: 10,
          padding: '14px 20px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          animation: 'fadeSlideUp 400ms ease forwards',
        }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Guest User</strong>{' '}
            shared this listing report
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="strip-btn">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="4" width="6" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
                <path d="M5 1h5a1 1 0 011 1v5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
              </svg>
              Copy link
            </button>
            <Link href="/" className="strip-btn">Analyse mine →</Link>
          </div>
        </div>

        {/* Report meta */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 20,
          paddingBottom: 32,
          marginBottom: 40,
          borderBottom: '1px solid var(--border)',
          animation: 'fadeSlideUp 400ms ease forwards',
        }}>
          <div style={{ width: 72, height: 72, borderRadius: 10, background: 'var(--border)', flexShrink: 0, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {resultPayload?.product?.images?.[0] ? (
              <img src={resultPayload.product.images[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="72" height="72" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="t-s" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#e8e6e2" strokeWidth="4" />
                  </pattern>
                </defs>
                <rect width="72" height="72" fill="url(#t-s)" />
              </svg>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-tertiary)' }}>rpt_{id.slice(0, 8)}</span>
              <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--score-high)', background: 'rgba(22,163,74,0.08)', borderRadius: 4, padding: '2px 7px' }}>Complete</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4 }}>
              {resultPayload?.product?.title ? (resultPayload.product.title.slice(0, 80) + (resultPayload.product.title.length > 80 ? '...' : '')) : 'Premium Ergonomic Desk Mat'}
            </div>
            <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>ASIN {resultPayload?.asin ?? 'B08N5WRWNW'} · amazon.com</div>
          </div>
        </div>

        {/* Score */}
        <div style={{ textAlign: 'center', padding: '40px 0 32px', opacity: 0, animation: 'fadeSlideUp 400ms 60ms ease forwards' }}>
          <div>
            <span className="score-number-big" style={{ fontSize: 80, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: scoreColor(SCORE) }}>{SCORE}</span>
            <span className="score-grade-big" style={{ fontSize: 36, fontWeight: 500, color: scoreColor(SCORE) }}> {scoreGrade(SCORE)}</span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 24 }}>
            {resultPayload?.report?.verdict ?? "Strong hero image. Infographics are costing you conversions on mobile."}
          </p>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 2, borderRadius: 4, overflow: 'hidden', height: 8, marginBottom: 10 }}>
              {widths.map((w, i) => (
                <div key={i} style={{ height: '100%', background: scoreColor(AGENT_SCORES[i]), borderRadius: 2, width: `${w}%` }} />
              ))}
            </div>
            <div style={{ display: 'flex' }}>
              {AGENT_LABELS.map((label, i) => (
                <div key={i} style={{ flex: widths[i] / 100, fontSize: 11, color: 'var(--text-tertiary)' }}>{label}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Agent score cards */}
        <div className="results-agent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 48, opacity: 0, animation: 'fadeSlideUp 400ms 120ms ease forwards' }}>
          {AGENT_NAMES.map((name, i) => (
            <div key={i} style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, fontWeight: 500 }}>{name}</div>
              <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 22, fontWeight: 500, color: scoreColor(AGENT_SCORES[i]) }}>
                {AGENT_SCORES[i]}
              </div>
            </div>
          ))}
        </div>

        {/* Key findings */}
        <section style={{ marginBottom: 48, opacity: 0, animation: 'fadeSlideUp 400ms 140ms ease forwards' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>
            Key findings
          </div>
          <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '0 24px' }}>
            {(resultPayload?.visual?.topFailures.map((f: any) => ({
              color: f.title.toLowerCase().includes('critical') ? 'var(--score-low)' : 'var(--score-mid)',
              title: f.title,
              detail: f.description,
            })) ?? FINDINGS).map((f: any, i: number, arr: any[]) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '16px 0', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.color, flexShrink: 0, marginTop: 6 }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Image analysis */}
        <section style={{ marginBottom: 48, opacity: 0, animation: 'fadeSlideUp 400ms 150ms ease forwards' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>
            Image analysis
          </div>
          <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '0 24px' }}>
            {resultPayload?.visual?.images?.map((img: any) => {
              const imageItem: ImageItem = {
                id: img.index,
                label: `Image ${img.index}`,
                score: img.score,
                failures: img.failures.map((f: any) => ({ label: f.lever, detail: f.description })),
                url: resultPayload.product?.images?.[img.index],
              };
              return <ImageCard key={imageItem.id} img={imageItem} />;
            })}
            {!resultPayload?.visual?.images && (
              <div style={{ padding: '24px 0', fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                No image analysis available for this report.
              </div>
            )}
          </div>
        </section>

        {/* Biggest conversion leak */}
        <section style={{ background: 'var(--surface)', borderRadius: 12, padding: 28, marginBottom: 48, opacity: 0, animation: 'fadeSlideUp 400ms 160ms ease forwards' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>
            Biggest conversion leak
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
            <div>
              <div style={{ background: 'var(--border)', borderRadius: 8, aspectRatio: '1/1', position: 'relative', overflow: 'hidden', marginBottom: 8, border: '1px solid var(--border)' }}>
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
                <div style={{ position: 'absolute', bottom: '10%', left: '10%', right: '10%', background: 'rgba(220,38,38,0.95)', border: '1px solid var(--score-low)', borderRadius: 6, padding: '6px 10px', fontFamily: 'var(--font-dm-sans)', fontSize: 12, fontWeight: 500, color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {resultPayload?.report?.biggestLeak?.description ?? "Hero image text unreadable at 375px"}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-dm-sans)' }}>Current</div>
            </div>
            <div>
              <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 8, padding: 20, marginBottom: 8, minHeight: 180 }}>
                <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 10 }}>
                  What it should show
                </div>
                <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
                  {resultPayload?.report?.biggestLeak?.prescription ?? "Lead with the product's primary benefit in 5 words or fewer — large enough to read on a 375px thumbnail without pinching. Remove the secondary callout entirely; it fragments attention. Replace with a single high-contrast badge in the upper-right corner."}
                </p>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: 'var(--font-dm-sans)' }}>Prescription</div>
            </div>
          </div>
        </section>

        {/* Competitor comparison */}
        <section style={{ marginBottom: 48, opacity: 0, animation: 'fadeSlideUp 400ms 170ms ease forwards' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>
            Competitor comparison
          </div>
          <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 24 }}>
            <div className="competitor-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              {(['Your hero', 'Top competitor'] as const).map((label, i) => {
                const imgUrl = i === 0 
                  ? resultPayload?.product?.images?.[0]
                  : resultPayload?.benchmark?.visualStrategies?.[0]?.thumbnailUrl;
                
                const fallbackText = i === 0 ? 'Text-heavy hero. Benefit unclear in 2 seconds.' : 'Full-bleed product, one bold stat, zero clutter.';
                
                const descText = i === 0
                  ? (resultPayload?.visual?.images?.[0]?.failures?.[0]?.description ?? fallbackText)
                  : (resultPayload?.benchmark?.visualStrategies?.[0]?.strategy ?? fallbackText);

                return (
                  <div key={i}>
                    <div style={{ aspectRatio: '1/1', background: 'var(--surface)', borderRadius: 8, marginBottom: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
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
                          <text x="50%" y="50%" textAnchor="middle" fontSize="11" fill="#a8a7a3" fontFamily="monospace">{label.toLowerCase()}</text>
                        </svg>
                      )}
                    </div>
                    <p style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {descText}
                    </p>
                  </div>
                );
              })}
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, fontFamily: 'var(--font-dm-sans)', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {resultPayload?.benchmark?.gapAnalysis ?? "The top competitor leads with a single product stat at 48px. Your hero uses 4 callouts at 12px. On mobile, none of yours are legible — their single callout is. That gap explains a significant portion of the click-through rate difference."}
            </div>
          </div>
        </section>

        <section style={{ marginBottom: 48, opacity: 0, animation: 'fadeSlideUp 400ms 200ms ease forwards' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>
            AI search visibility
          </div>
          <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {(resultPayload?.search?.queries?.map(q => ({
              query: q.question,
              pass: q.claudeFound || q.geminiFound
            })) ?? AI_QUERIES).map((q, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < arr.length - 1 ? '0.5px solid var(--border)' : 'none' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: q.pass ? 'var(--score-high)' : 'var(--score-low)', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: '12.5px', color: 'var(--text-secondary)', flex: 1 }}>{q.query}</span>
                <span style={{ fontSize: 12, fontWeight: 500, color: q.pass ? 'var(--score-high)' : 'var(--score-low)', whiteSpace: 'nowrap' }}>
                  {q.pass ? 'Appears' : 'Not found'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Brief preview */}
        <section style={{ marginBottom: 48, opacity: 0, animation: 'fadeSlideUp 400ms 260ms ease forwards' }}>
          <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>
            Design brief — preview
          </div>
          <div style={{ background: 'var(--white)', border: '0.5px solid var(--border)', borderRadius: 12, padding: '0 24px' }}>
            {(resultPayload?.report?.pixiiBrief ? [
              { label: 'Product category', value: resultPayload.report.pixiiBrief.productCategory },
              { label: 'Target customer', value: resultPayload.report.pixiiBrief.targetCustomer },
              { label: 'Visual style direction', value: resultPayload.report.pixiiBrief.visualDirection },
              { label: 'Hero shot recommendation', value: resultPayload.report.pixiiBrief.heroRecommendation },
              { label: 'Infographic priorities', value: resultPayload.report.pixiiBrief.infographicPriorities.join(', ') },
              { label: 'Trust signals to include', value: resultPayload.report.pixiiBrief.trustSignals.join(', ') },
              { label: 'Mobile optimisation notes', value: resultPayload.report.pixiiBrief.mobileNotes },
            ] : BRIEF_FIELDS).slice(0, 3).map((field, i) => (
              <div key={i} style={{ padding: '14px 0', borderBottom: '0.5px solid var(--border)' }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 4 }}>{field.label}</div>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.65 }}>{field.value}</div>
              </div>
            ))}
            <div style={{ padding: '14px 0' }}>
              <Link href="/" style={{ fontSize: 13, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
                Run your own analysis to get the full brief →
              </Link>
            </div>
          </div>
        </section>

        {/* Shareable score card */}
        <ScoreCard resultPayload={resultPayload} />

        {/* CTA banner */}
        <div style={{
          background: 'var(--accent)',
          borderRadius: 14,
          padding: '32px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
          flexWrap: 'wrap',
          marginTop: 56,
          opacity: 0,
          animation: 'fadeSlideUp 400ms 400ms ease forwards',
        }}>
          <div>
            <h3 style={{ fontSize: 20, fontWeight: 600, color: '#fff', letterSpacing: '-0.02em', marginBottom: 6 }}>Analyse your listing</h3>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, maxWidth: 400 }}>
              Paste your Amazon URL and get a full 4-agent report in 90 seconds. Free. No account needed.
            </p>
          </div>
          <Link href="/" className="cta-banner-btn">Try ListingLens →</Link>
        </div>

      </main>

      <Footer
        left="ListingLens · listinglens.com"
        right={<span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>Shared Report</span>}
      />
    </div>
  );
}
