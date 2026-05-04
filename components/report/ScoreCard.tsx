'use client';

import { useRef, useCallback } from 'react';
import { toPng } from 'html-to-image';
import type { CachedResult } from '@/lib/schemas/report'; // Assuming this exists or using any

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

const DEMO_SCORE = 63;

export default function ScoreCard({ resultPayload }: { resultPayload?: any }) {
  const scoreCardRef = useRef<HTMLDivElement>(null);

  const handleDownloadScoreCard = useCallback(async () => {
    if (!scoreCardRef.current) return;
    try {
      const dataUrl = await toPng(scoreCardRef.current, { cacheBust: true, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `listing-score-${resultPayload?.product?.asin ?? 'demo'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to generate image:', err);
    }
  }, [resultPayload]);

  return (
    <section style={{ marginBottom: 48, opacity: 0, animation: 'fadeSlideUp 500ms cubic-bezier(0.16,1,0.3,1) 520ms forwards' }}>
      <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-tertiary)', marginBottom: 16 }}>
        Shareable score card
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
        <div ref={scoreCardRef} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 12, padding: 24, width: '100%', maxWidth: 480 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-tertiary)' }} />
            <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>ListingLens</span>
          </div>
          <div style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 13, fontWeight: 500, color: scoreColor(resultPayload?.report?.overallScore ?? DEMO_SCORE), background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 6, padding: '3px 10px' }}>
            {resultPayload?.report?.overallScore ?? DEMO_SCORE} · {scoreGrade(resultPayload?.report?.overallScore ?? DEMO_SCORE)}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: 8, background: 'var(--border)', flexShrink: 0, overflow: 'hidden' }}>
            {resultPayload?.product?.images?.[0] ? (
              <img src={`/api/proxy-image?url=${encodeURIComponent(resultPayload.product.images[0])}`} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="thumb-stripe" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="8" stroke="#e8e6e2" strokeWidth="4" />
                  </pattern>
                </defs>
                <rect width="64" height="64" fill="url(#thumb-stripe)" />
              </svg>
            )}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>
              {resultPayload?.product?.title ? (resultPayload.product.title.slice(0, 40) + '...') : 'Premium Desk Mat'}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Images: ✗', 'Reviews: ✓', 'AI: ✗'].map((t, i) => (
                <span key={i} style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 6px' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {(resultPayload?.visual?.topFailures?.map((f: any) => f.title) ?? [
              'Hero image text unreadable at 375px — affects 61% of shoppers',
              'Missing from 4 of 6 AI search results for key queries',
              'Competitor leads with single-stat hero; yours uses 4 callouts',
            ]).slice(0, 3).map((bullet: string, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--score-low)', flexShrink: 0, marginTop: 7 }} />
                <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{bullet}</span>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
            <a href="https://pixii.ai" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}>
              Get this fixed with Pixii →
            </a>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="btn-ghost" onClick={handleDownloadScoreCard}>Download score card</button>
      </div>
    </section>
  );
}
