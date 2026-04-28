import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * Mobile-first auth page wrapper. Renders a small wordmark, then the
 * route's title + body in a tight centered column. Use <PageTitle> and
 * <PageHelper> inside it.
 */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <div className="page__inner">
        <Link to="/login" className="brand">File Exchange</Link>
        {children}
      </div>
    </div>
  );
}

export function PageTitle({ children }: { children: ReactNode }) {
  return <h1 className="title">{children}</h1>;
}

export function PageHelper({ children }: { children: ReactNode }) {
  return <p className="helper">{children}</p>;
}
