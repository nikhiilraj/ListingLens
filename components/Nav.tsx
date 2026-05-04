'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavProps {
  variant?: 'default' | 'results';
}

const NAV_LINKS = [
  { label: 'How it works', href: '/how-it-works' },
  { label: 'Built with →', href: '/built-with' },
];

export default function Nav({ variant = 'default' }: NavProps) {
  const pathname = usePathname();

  return (
    <nav style={{
      height: 56,
      background: 'var(--white)',
      borderBottom: '0.5px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}>
      <Link
        href="/"
        style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}
      >
        <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)' }} />
        <span style={{
          fontFamily: 'var(--font-dm-sans)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
        }}>
          ListingLens
        </span>
      </Link>

      {variant === 'default' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link${pathname === link.href ? ' active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {variant === 'results' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="share-btn"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'Listing report — ListingLens', url: window.location.href });
              } else {
                navigator.clipboard.writeText(window.location.href).catch(() => {});
              }
            }}
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M9 1.5L11.5 4L9 6.5M11.5 4H5C3.067 4 1.5 5.567 1.5 7.5V11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Share report
          </button>
          <Link href="/" className="nav-cta" style={{ background: 'var(--accent)' }}>
            Analyse your listing →
          </Link>
        </div>
      )}
    </nav>
  );
}
