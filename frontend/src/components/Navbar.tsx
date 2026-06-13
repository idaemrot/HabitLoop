import { Link, useLocation } from 'react-router-dom';

// ─── Navbar ────────────────────────────────────────────────────────────────────
export default function Navbar(): JSX.Element {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <nav className="navbar">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <span className="w-8 h-8 rounded-lg bg-lime flex items-center justify-center text-base select-none">
          🔁
        </span>
        <span
          className="display-sm text-ink group-hover:text-purple transition-colors duration-200"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
        >
          HabitLoop
        </span>
      </Link>

      {/* Nav links */}
      <div className="hidden md:flex items-center gap-6">
        <Link
          to="/#features"
          className="text-sm text-muted hover:text-ink transition-colors duration-150 font-medium"
        >
          Features
        </Link>
        <Link
          to="/#how-it-works"
          className="text-sm text-muted hover:text-ink transition-colors duration-150 font-medium"
        >
          How it works
        </Link>
        <Link
          to="/#pricing"
          className="text-sm text-muted hover:text-ink transition-colors duration-150 font-medium"
        >
          Pricing
        </Link>
      </div>

      {/* CTA */}
      <div className="flex items-center gap-3">
        {isHome ? (
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
