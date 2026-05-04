'use client';

import type { Report } from '@/lib/schemas/report';

type BriefData = Report['pixiiBrief'];

const FALLBACK: BriefData = {
  productCategory: 'Premium desk accessories — ergonomic workspace',
  targetCustomer: 'Remote workers, 28–42, investing in home-office quality. Buyers who have already tried a cheap mat and want the permanent upgrade. They read specs before purchasing and respond to precise language over lifestyle imagery.',
  visualDirection: 'Clean, minimal, premium — white backgrounds, precise margins, no lifestyle clutter. Typography-led infographics. Every frame contains one claim and one supporting data point.',
  heroRecommendation: 'Full-bleed product on white with a single bold callout: the primary differentiator in 5 words or fewer. Remove all secondary text from the hero frame.',
  infographicPriorities: [
    'Non-slip base detail shot — macro closeup of the textured underside with a single callout: "Stays put on glass, wood, or laminate."',
    'Wireless charging zone diagram — top-down view with the active charging zone highlighted and exact dimensions labelled.',
    'Dimensions with human-scale reference — full mat laid flat with a keyboard and mouse in frame for context.',
  ],
  trustSignals: [
    'Materials certification badge — move to image 2, not buried in image 6.',
    '18-month warranty badge — feature as a standalone element, minimum 48px tall at 375px.',
    'Exact measurements in millimetres — replace all "XL" references with precise numbers.',
  ],
  mobileNotes: 'Max 6 words per callout. Minimum 16px text on all images. Test every frame at 375px before upload. The current hero fails this threshold — 9pt font is unreadable on any mobile screen.',
  searchKeywords: ['non-slip desk mat', 'wireless charging desk pad', 'waterproof desk mat', 'ergonomic desk setup', 'remote work accessories', 'large mouse pad', 'premium desk pad'],
  competitorOpening: 'No competitor shows a split-view of the surface texture. First to show a material closeup wins the tactile buyer — the shopper who needs to feel confident about quality before buying online.',
};

const label = (text: string) => (
  <div style={{
    fontFamily: 'var(--font-jetbrains-mono)',
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.14em',
    textTransform: 'uppercase' as const,
    color: '#a8a7a3',
    marginBottom: 8,
  }}>
    {text}
  </div>
);

const prose = (text: string) => (
  <div style={{
    fontFamily: 'var(--font-dm-sans)',
    fontSize: 14,
    color: 'var(--text-primary)',
    lineHeight: 1.7,
  }}>
    {text}
  </div>
);

function NumberedList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <span style={{
            fontFamily: 'var(--font-jetbrains-mono)',
            fontSize: 11,
            color: '#a8a7a3',
            flexShrink: 0,
            paddingTop: 2,
            minWidth: 18,
          }}>
            {i + 1}.
          </span>
          <span style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 14,
            color: 'var(--text-primary)',
            lineHeight: 1.65,
          }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#a8a7a3', flexShrink: 0, marginTop: 7,
          }} />
          <span style={{
            fontFamily: 'var(--font-dm-sans)',
            fontSize: 14,
            color: 'var(--text-primary)',
            lineHeight: 1.65,
          }}>
            {item}
          </span>
        </div>
      ))}
    </div>
  );
}

function KeywordTags({ items }: { items: string[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
      {items.map((item, i) => (
        <span key={i} style={{
          fontFamily: 'var(--font-jetbrains-mono)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          padding: '4px 10px',
        }}>
          {item}
        </span>
      ))}
    </div>
  );
}

function Row({ fieldLabel, children, last }: { fieldLabel: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      padding: '22px 28px',
      borderBottom: last ? 'none' : '0.5px solid var(--border)',
    }}>
      {label(fieldLabel)}
      {children}
    </div>
  );
}

export default function PixiiBrief({ brief }: { brief: BriefData | null | undefined }) {
  const d = brief ?? FALLBACK;

  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
      <Row fieldLabel="Product category">{prose(d.productCategory)}</Row>
      <Row fieldLabel="Target customer">{prose(d.targetCustomer)}</Row>
      <Row fieldLabel="Visual direction">{prose(d.visualDirection)}</Row>
      <Row fieldLabel="Hero shot recommendation">{prose(d.heroRecommendation)}</Row>
      <Row fieldLabel="Infographic priorities"><NumberedList items={d.infographicPriorities} /></Row>
      <Row fieldLabel="Trust signals"><BulletList items={d.trustSignals} /></Row>
      <Row fieldLabel="Mobile notes">{prose(d.mobileNotes)}</Row>
      <Row fieldLabel="Search keywords"><KeywordTags items={d.searchKeywords} /></Row>
      <Row fieldLabel="What competitors aren't doing" last>{prose(d.competitorOpening)}</Row>
    </div>
  );
}
