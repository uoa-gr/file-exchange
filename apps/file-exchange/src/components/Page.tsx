import type { ReactNode } from 'react';

/**
 * Paper sheet. Holds the page chrome (cream background painted globally
 * via styles.css; this just provides padding + max width). Routes wrap
 * their content in <Chapter> for the two-column gutter layout.
 */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="paper">
      <div className="paper__inner">{children}</div>
    </div>
  );
}
