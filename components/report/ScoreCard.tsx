'use client';

import { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';

function scoreColor(s: number) {
  if (s >= 75) return '#16a34a';
  if (s >= 45) return '#d97706';
  return '#dc2626';
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

function twoSentences(text: string): string {
  const matches = text.match(/[^.!?]+[.!?]+/g);
  if (!matches) return text;
  return matches.slice(0, 2).join(' ').trim();
}

const DEMO_SCORE = 63;
const DEMO_SUB = [58, 71, 44, 79];
const SUB_LABELS = ['Images', 'Reviews', 'AI search', 'Competition'];

export default function ScoreCard({ resultPayload }: { resultPayload?: any }) {
  const scoreCardRef = useRef<HTMLDivElement>(null);

  const handleDownload = useCallback(async () => {
    if (!scoreCardRef.current) return;
    try {
      const dataUrl = await toPng(scoreCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `listinglens-${resultPayload?.product?.asin ?? 'score'}.png`;
      link.href = dataUrl;
      link.click();
    } catch {}
  }, [resultPayload]);

  const score = resultPayload?.report?.overallScore ?? DEMO_SCORE;
  const grade = scoreGrade(score);
  const color = scoreColor(score);
  const verdict = twoSentences(
    resultPayload?.report?.verdict ?? 'Strong hero image. Infographics are costing you conversions on mobile.'
  );

  const subScores = [
    resultPayload?.visual?.overallScore ?? DEMO_SUB[0],
    resultPayload?.review?.overallScore ?? DEMO_SUB[1],
    resultPayload?.search?.visibilityScore ?? DEMO_SUB[2],
    resultPayload?.benchmark?.overallScore ?? DEMO_SUB[3],
  ];

  const bullets: string[] = (
    resultPayload?.visual?.topFailures?.map((f: any) => f.title) ?? [
      'Hero image text unreadable at 375px — affects 61% of shoppers',
      'Missing from 4 of 6 AI search results for key queries',
      'Competitor leads with single-stat hero; yours uses 4 callouts',
    ]
  ).slice(0, 3);

  return (
    <section style={{ marginBottom: 72, opacity: 0, animation: 'fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1) 520ms forwards' }}>

      <div style={{
        fontFamily: 'var(--font-dm-sans)',
        fontSize: 11,
        fontWeight: 500,
        letterSpacing: '0.20em',
        textTransform: 'uppercase',
        color: '#a8a7a3',
        marginBottom: 20,
      }}>
        Score card
      </div>

      <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div ref={scoreCardRef} style={{
        background: '#111110',
        borderRadius: 16,
        padding: '28px 32px 24px',
        width: '100%',
        maxWidth: 480,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Thin color bar at top keyed to score health */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: color,
        }} />

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', opacity: 0.85 }} />
            <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              ListingLens
            </span>
          </div>
          {resultPayload?.product?.asin && (
            <span style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.05em' }}>
              {resultPayload.product.asin}
            </span>
          )}
        </div>

        {/* Score hero */}
        <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 6 }}>
          <span style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 56,
            fontWeight: 700,
            lineHeight: 0.9,
            letterSpacing: '-0.05em',
            color,
          }}>
            {score}
          </span>
          <div style={{ paddingBottom: 4, marginLeft: 12 }}>
            <div style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color,
              lineHeight: 1,
            }}>
              {grade}
            </div>
            <div style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 10,
              color: 'rgba(255,255,255,0.3)',
              marginTop: 4,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Listing score
            </div>
          </div>
        </div>

        {/* Verdict */}
        <p style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 13,
          color: 'rgba(255,255,255,0.6)',
          lineHeight: 1.65,
          margin: '14px 0 24px',
        }}>
          {verdict}
        </p>

        {/* Sub-scores */}
        <div style={{
          display: 'flex',
          marginBottom: 20,
          paddingBottom: 20,
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          {SUB_LABELS.map((label, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{
                fontFamily: 'var(--font-jetbrains-mono)',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: scoreColor(subScores[i]),
                lineHeight: 1,
                marginBottom: 4,
              }}>
                {subScores[i]}
              </div>
              <div style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 10,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.03em',
              }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        {/* Key issues */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
          {bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: '#dc2626',
                flexShrink: 0,
                marginTop: 6,
              }} />
              <span style={{
                fontFamily: 'var(--font-dm-sans)',
                fontSize: 12,
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.55,
              }}>
                {b}
              </span>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <a
            href="https://pixii.ai"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontFamily: 'var(--font-dm-sans)',
              fontSize: 13,
              color: 'rgba(255,255,255,0.45)',
              textDecoration: 'none',
              letterSpacing: '-0.01em',
            }}
          >
            Fix this with Pixii →
          </a>
          <span style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 11,
            color: 'rgba(255,255,255,0.18)',
            letterSpacing: '0.04em',
          }}>
            listinglens.ai
          </span>
        </div>
      </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <button type="button" className="btn-ghost" onClick={handleDownload}>Download score card</button>
      </div>
    </section>
  );
}
