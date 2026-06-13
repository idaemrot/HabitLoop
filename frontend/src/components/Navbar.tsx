import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authContext';

// ─── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar(): JSX.Element {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isHome = pathname === '/';

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="flex items-center group">
        <span
          className="display-sm text-ink group-hover:text-purple transition-colors duration-200"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
        >
          HabitLoop
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-6">
        <a
          href="#features"
          className="text-sm text-muted hover:text-ink transition-colors duration-150 font-medium"
        >
          Features
        </a>
        <a
          href="#how-it-works"
          className="text-sm text-muted hover:text-ink transition-colors duration-150 font-medium"
        >
          How it works
        </a>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3">
        {user ? (
          <Link to="/dashboard" className="btn-lime text-xs px-4 py-2">
            Dashboard →
          </Link>
        ) : isHome ? (
          <>
            <Link to="/login" className="btn-ghost text-xs px-4 py-2">
              Sign in
            </Link>
            <Link to="/signup" className="btn-lime text-xs px-4 py-2">
              Get started →
            </Link>
          </>
        ) : (
          <Link to="/" className="btn-ghost text-xs px-4 py-2">
            ← Back home
          </Link>
        )}
      </div>
    </nav>
  );
}
