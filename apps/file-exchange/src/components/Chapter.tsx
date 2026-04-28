import type { ReactNode } from 'react';

interface ChapterProps {
  /** Roman numeral as a string ("I.", "II.", "III.") shown above the title. */
  roman?: string;
  /** Display title — set in italic Cormorant Garamond at heroic size. */
  title: string;
  /** Optional italic strapline below the title. */
  subtitle?: string;
  /** Right-gutter marginalia on wide screens; stacks below on narrow. */
  marginalia?: ReactNode;
  children: ReactNode;
}

/**
 * A leaf of the manuscript: roman numeral + display title + double-rule
 * + body + optional marginalia gutter. Use this to wrap every route.
 */
export function Chapter({ roman, title, subtitle, marginalia, children }: ChapterProps) {
  return (
    <article className="leaf">
      <div className="leaf__main">
        <header>
          <h1 className="display">
            {roman && <span className="display__roman">{roman}</span>}
            {title}
          </h1>
          {subtitle && <p className="subtitle">{subtitle}</p>}
        </header>
        <div className="rule--double" aria-hidden="true" />
        {children}
      </div>
      {marginalia && <aside className="leaf__aside">{marginalia}</aside>}
    </article>
  );
}

/** A short italic note. Used inside <Chapter marginalia={...}> or inline. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="aside-note">{children}</p>;
}

/** Hairline rule between sections within a leaf. */
export function Fleuron({ mark = '❦' }: { mark?: string }) {
  return (
    <div className="fleuron" role="separator" aria-hidden="true">
      <span className="fleuron__mark">{mark}</span>
    </div>
  );
}
