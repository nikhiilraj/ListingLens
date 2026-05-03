import Link from 'next/link';

interface FooterProps {
  maxWidth?: number;
  left?: string;
  right?: React.ReactNode;
}

export default function Footer({ maxWidth = 760, left, right }: FooterProps) {
  return (
    <footer style={{
      borderTop: '0.5px solid var(--border)',
      padding: '32px 24px',
      background: 'var(--white)',
    }}>
      <div style={{
        maxWidth,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <span style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)' }}>
          {left ?? 'ListingLens — built for Pixii'}
        </span>
        {right ?? (
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            {[
              { label: 'How it works', href: '/how-it-works' },
              { label: 'Built with', href: '/built-with' },
              { label: 'API', href: '/api-docs' },
            ].map(link => (
              <Link
                key={link.href}
                href={link.href}
                style={{ fontFamily: 'var(--font-dm-sans)', fontSize: 12, color: 'var(--text-tertiary)', textDecoration: 'none' }}
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}
