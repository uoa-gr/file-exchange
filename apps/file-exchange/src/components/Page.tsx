import type { ReactNode } from 'react';

/**
 * Single-screen auth shell. Cream paper canvas with a small circular
 * lunar art accent in the corner. "File Exchange" set in calligraphic
 * Italianno script as the central spotlight, hairline+fleuron rule,
 * and a compact form card centered below.
 */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <div className="page__stack">
        <header className="page__hero">
          <h1 className="hero">File Exchange</h1>
          <p className="tagline">End-to-end encrypted file transfer</p>
          <div className="hero-rule" aria-hidden="true">
            <span className="hero-rule__mark">❦</span>
          </div>
        </header>
        <div className="page__card">{children}</div>
      </div>
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h2 className="title">{children}</h2>;
}

export function PageHelper({ children }: { children: ReactNode }) {
  return <p className="helper">{children}</p>;
}
