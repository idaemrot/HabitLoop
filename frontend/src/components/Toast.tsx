import { useEffect } from 'react';

// ─── Toast ────────────────────────────────────────────────────────────────────
// Lightweight fixed-position error notification.
// Auto-dismisses after `duration` ms. Caller controls visibility via `message`.
//
// Usage:
//   const [toastMsg, setToastMsg] = useState<string | null>(null);
//   <Toast message={toastMsg} onDismiss={() => setToastMsg(null)} />

interface ToastProps {
  message:   string | null;
  onDismiss: () => void;
  duration?: number;   // ms before auto-dismiss, default 4000
}

export default function Toast({
  message,
  onDismiss,
  duration = 4000,
}: ToastProps): JSX.Element | null {
  // Auto-dismiss timer — resets whenever message changes
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [message, onDismiss, duration]);

  if (!message) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]
                 flex items-center gap-3
                 px-5 py-3.5 rounded-2xl
                 bg-ink text-white text-sm
                 shadow-panel animate-fade-up"
      style={{ fontFamily: "'Inter', sans-serif", maxWidth: '420px', width: 'max-content' }}
    >
      <span className="text-base flex-shrink-0">⚠️</span>
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-2 flex-shrink-0 text-white/50 hover:text-white transition-colors text-lg leading-none"
      >
        ×
      </button>
    </div>
  );
}
