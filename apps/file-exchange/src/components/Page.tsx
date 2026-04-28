import type { ReactNode } from 'react';

/**
 * Mobile-first auth page wrapper. Top: lunar-painting backdrop with
 * "File Exchange" italic hero spanning full viewport width. Bottom:
 * cream-faded compact card holding the route's title + form.
 */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <header className="page__hero">
        <h1 className="hero">File Exchange</h1>
        <p className="tagline">End-to-end encrypted file transfer</p>
      </header>
      <div className="page__card">{children}</div>
    </div>
  );
}

/** Sub-heading inside the card (e.g. "Sign in", "Create account"). */
export function PageTitle({ children }: { children: ReactNode }) {
  return <h2 className="title">{children}</h2>;
}

export function PageHelper({ children }: { children: ReactNode }) {
  return <p className="helper">{children}</p>;
}
