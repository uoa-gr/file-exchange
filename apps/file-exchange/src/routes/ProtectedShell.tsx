import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Page } from '../components/Page.js';
import { signOut } from '../auth/api.js';

const sections = [
  { to: '/inbox',  roman: 'I',   label: 'Inbox' },
  { to: '/outbox', roman: 'II',  label: 'Outbox' },
  { to: '/send',   roman: 'III', label: 'Send' },
] as const;

export function ProtectedShell() {
  const navigate = useNavigate();
  return (
    <Page>
      <header className="colophon">
        <Link to="/inbox" className="colophon__brand">File Exchange</Link>
        <nav aria-label="Primary" className="colophon__nav">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) => `colophon__link ${isActive ? 'is-active' : ''}`}
            >
              <span className="colophon__link__roman" aria-hidden="true">{s.roman}.</span>
              {s.label}
            </NavLink>
          ))}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
          >
            Sign out
          </button>
        </nav>
      </header>
      <div className="shell-main"><Outlet /></div>
    </Page>
  );
}
