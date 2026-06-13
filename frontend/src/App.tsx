import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './store/authContext';
import ProtectedRoute  from './components/ProtectedRoute';

// ─── Pages ────────────────────────────────────────────────────────────────────
import LandingPage      from './pages/LandingPage';
import LoginPage        from './pages/LoginPage';
import RegisterPage     from './pages/RegisterPage';
import DashboardPage    from './pages/DashboardPage';
import NotFoundPage     from './pages/NotFoundPage';

// ─── HabitLoop App ────────────────────────────────────────────────────────────
export default function App(): JSX.Element {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ── Public routes ───────────────────────────────────────── */}
          <Route path="/"       element={<LandingPage />}  />
          <Route path="/login"  element={<LoginPage />}    />
          <Route path="/signup" element={<RegisterPage />} />

          {/* ── Protected routes (require auth) ─────────────────────── */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardPage />} />
          </Route>

          {/* ── Redirects ───────────────────────────────────────────── */}
          <Route path="/register" element={<Navigate to="/signup" replace />} />

          {/* ── 404 ─────────────────────────────────────────────────── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
