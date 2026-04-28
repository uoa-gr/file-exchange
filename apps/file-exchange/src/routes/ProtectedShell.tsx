import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from '../auth/api.js';

const sections = [
  { to: '/inbox',  label: 'Inbox' },
  { to: '/outbox', label: 'Outbox' },
  { to: '/send',   label: 'Send' },
] as const;

export function ProtectedShell() {
  const navigate = useNavigate();
  return (
    <div className="shell">
      <header className="shell__top">
        <Link to="/inbox" className="shell__brand">File Exchange</Link>
        <nav aria-label="Primary" className="shell__nav">
          {sections.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              className={({ isActive }) => `shell__nav-link ${isActive ? 'is-active' : ''}`}
            >
              {s.label}
            </NavLink>
          ))}
          <button
            type="button"
            className="shell__signout"
            onClick={async () => { await signOut(); navigate('/login', { replace: true }); }}
          >
            Sign out
          </button>
        </nav>
      </header>
      <main className="shell__main">
        <div className="shell__main-inner"><Outlet /></div>
      </main>
    </div>
  );
}
