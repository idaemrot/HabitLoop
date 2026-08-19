// ─── Test environment defaults ────────────────────────────────────────────────
// config/env.ts validates process.env at import time and calls process.exit(1)
// if required vars (DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET) are missing.
// CI has no backend/.env file (it's gitignored), so without these fallbacks
// every test that transitively imports config/env.ts kills the whole run.
// Runs before any test file is loaded; dotenv.config() (inside config/env.ts)
// never overwrites vars already present in process.env, so these are safe,
// hermetic defaults that never point at a real database or secret.
process.env.DATABASE_URL        ??= 'postgresql://test:test@localhost:5432/habitloop_test';
process.env.JWT_SECRET          ??= 'test-only-jwt-secret-do-not-use-in-prod';
process.env.JWT_REFRESH_SECRET  ??= 'test-only-refresh-secret-do-not-use-in-prod';
process.env.REDIS_URL           ??= 'redis://localhost:6379';
process.env.NODE_ENV            ??= 'test';
