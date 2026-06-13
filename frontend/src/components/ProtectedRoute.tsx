import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../store/authContext';

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function SessionLoader(): JSX.Element {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <span
          className="display-sm text-xl text-ink animate-pulse"
          style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}
        >
          HabitLoop
        </span>
        <p className="text-sm text-muted">
          Restoring session…
        </p>
      </div>
    </div>
  );
}

// ─── ProtectedRoute ───────────────────────────────────────────────────────────
// Wraps routes that require authentication.
// Usage in App.tsx:
//   <Route element={<ProtectedRoute />}>
//     <Route path="/dashboard" element={<DashboardPage />} />
//   </Route>
export default function ProtectedRoute(): JSX.Element {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Wait for session restore before making a redirect decision
  if (isLoading) return <SessionLoader />;

  // Not authenticated — redirect to login, remember the intended destination
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Authenticated — render the child route
  return <Outlet />;
}
