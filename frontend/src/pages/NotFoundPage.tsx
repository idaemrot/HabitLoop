import { Link } from 'react-router-dom';

// ─── 404 Not Found Page ───────────────────────────────────────────────────────
export default function NotFoundPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center px-6 text-center">
      {/* Badge */}
      <span className="badge-lime mb-6 text-xs">404 error</span>

      {/* Headline */}
      <h1 className="display-xl text-ink mb-4">
        Lost your
        <br />
        <span className="text-gradient">streak?</span>
      </h1>

      <p className="text-muted text-base max-w-sm mb-10">
        This page doesn't exist — but your habits don't have to disappear with it.
      </p>

      <div className="flex items-center gap-4">
        <Link to="/" className="btn-lime px-8 py-3.5">
          Back to HabitLoop →
        </Link>
        <Link to="/login" className="btn-ghost px-8 py-3.5">
          Sign in
        </Link>
      </div>

      {/* Decorative number */}
      <p
        className="absolute bottom-8 text-[20vw] font-black select-none pointer-events-none"
        style={{
          color: 'transparent',
          WebkitTextStroke: '1px #E0E0E0',
          fontFamily: "'Space Grotesk', sans-serif",
          zIndex: 0,
        }}
      >
        404
      </p>
    </div>
  );
}
