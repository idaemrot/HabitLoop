import { useState, useEffect } from 'react';
import type { Habit, CreateHabitPayload, UpdateHabitPayload } from '../types';

// ─── Palette & Icon options ───────────────────────────────────────────────────
const COLORS = [
  { hex: '#D4FF4F', label: 'Lime'   },
  { hex: '#6C5CE7', label: 'Purple' },
  { hex: '#74C0FC', label: 'Sky'    },
  { hex: '#FF7675', label: 'Coral'  },
  { hex: '#FDCB6E', label: 'Amber'  },
  { hex: '#00B894', label: 'Teal'   },
  { hex: '#E17055', label: 'Orange' },
  { hex: '#A29BFE', label: 'Lavender' },
];

const ICONS = [
  { value: 'flame',  label: '🔥' },
  { value: 'book',   label: '📖' },
  { value: 'run',    label: '🏃' },
  { value: 'meditate', label: '🧘' },
  { value: 'water',  label: '💧' },
  { value: 'barbell', label: '💪' },
  { value: 'pen',    label: '✍️' },
  { value: 'star',   label: '⭐' },
  { value: 'moon',   label: '🌙' },
  { value: 'apple',  label: '🍎' },
  { value: 'music',  label: '🎵' },
  { value: 'code',   label: '💻' },
];

// ─── Props ────────────────────────────────────────────────────────────────────
interface HabitModalProps {
  open:      boolean;
  habit?:    Habit | null;       // null = create mode, Habit = edit mode
  onClose:   () => void;
  onCreate?: (payload: CreateHabitPayload) => Promise<void>;
  onUpdate?: (id: string, payload: UpdateHabitPayload) => Promise<void>;
}

// ─── HabitModal ───────────────────────────────────────────────────────────────
export default function HabitModal({
  open,
  habit,
  onClose,
  onCreate,
  onUpdate,
}: HabitModalProps): JSX.Element | null {
  const isEdit = !!habit;

  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [frequency,   setFrequency]   = useState<'DAILY' | 'WEEKLY' | 'CUSTOM'>('DAILY');
  const [color,       setColor]       = useState('#6C5CE7');
  const [icon,        setIcon]        = useState('flame');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [titleError,  setTitleError]  = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setDescription(habit.description ?? '');
      setFrequency(habit.frequency);
      setColor(habit.color);
      setIcon(habit.icon);
    } else {
      setTitle('');
      setDescription('');
      setFrequency('DAILY');
      setColor('#6C5CE7');
      setIcon('flame');
    }
    setError(null);
    setTitleError(null);
  }, [habit, open]);

  const validate = (): boolean => {
    if (!title.trim()) {
      setTitleError('Title is required');
      return false;
    }
    if (title.trim().length > 100) {
      setTitleError('Title must be at most 100 characters');
      return false;
    }
    setTitleError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setError(null);
    setLoading(true);

    try {
      if (isEdit && habit && onUpdate) {
        await onUpdate(habit.id, {
          title:       title.trim(),
          description: description.trim() || undefined,
          frequency,
          color,
          icon,
        });
      } else if (!isEdit && onCreate) {
        await onCreate({
          title:       title.trim(),
          description: description.trim() || undefined,
          frequency,
          color,
          icon,
        });
      }
      onClose();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const selectedIconLabel = ICONS.find((i) => i.value === icon)?.label ?? '🔥';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        style={{ backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Modal panel */}
      <div
        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                   w-full max-w-md bg-surface rounded-3xl shadow-panel
                   border border-border animate-fade-up flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <div>
            <p className="label-upper">
              {isEdit ? 'Edit habit' : 'New habit'}
            </p>
            <h2 className="display-sm text-ink mt-0.5">
              {isEdit ? 'Update your habit' : 'Build something new'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center
                       text-muted hover:bg-canvas hover:text-ink transition-all"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4 overflow-y-auto">
          {/* Global error */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5" htmlFor="habit-title">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="habit-title"
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setTitleError(null); }}
              className={`input-field ${titleError ? 'border-red-400 focus:ring-red-200' : ''}`}
              placeholder="e.g. Morning meditation"
              maxLength={100}
              autoFocus
            />
            <div className="flex items-center justify-between mt-1">
              {titleError
                ? <p className="text-xs text-red-600">{titleError}</p>
                : <span />
              }
              <p className="text-xs text-muted ml-auto">{title.length}/100</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1.5" htmlFor="habit-desc">
              Description <span className="text-muted font-normal">(optional)</span>
            </label>
            <textarea
              id="habit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              placeholder="What does this habit involve?"
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Frequency */}
          <div>
            <p className="text-xs font-medium text-ink mb-2">Frequency</p>
            <div className="flex gap-2">
              {(['DAILY', 'WEEKLY', 'CUSTOM'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFrequency(f)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    frequency === f
                      ? 'bg-ink text-white border-ink'
                      : 'bg-canvas text-muted border-border hover:border-ink'
                  }`}
                  style={{ fontFamily: "'Space Grotesk', sans-serif" }}
                >
                  {f.charAt(0) + f.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Color + Icon row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Color */}
            <div>
              <p className="text-xs font-medium text-ink mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setColor(c.hex)}
                    title={c.label}
                    className={`w-7 h-7 rounded-full transition-all ${
                      color === c.hex ? 'ring-2 ring-offset-2 ring-ink scale-110' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Icon */}
            <div>
              <p className="text-xs font-medium text-ink mb-2">Icon</p>
              <div className="flex flex-wrap gap-1.5">
                {ICONS.map((ic) => (
                  <button
                    key={ic.value}
                    type="button"
                    onClick={() => setIcon(ic.value)}
                    className={`w-7 h-7 rounded-lg text-base flex items-center justify-center transition-all ${
                      icon === ic.value
                        ? 'bg-ink scale-110 ring-2 ring-ink ring-offset-1'
                        : 'bg-canvas hover:bg-border'
                    }`}
                  >
                    {ic.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview pill */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-canvas border border-border">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ backgroundColor: color }}
            >
              {selectedIconLabel}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {title.trim() || 'Your habit name'}
              </p>
              <p className="text-xs text-muted">
                {frequency.charAt(0) + frequency.slice(1).toLowerCase()}
                {description.trim() ? ` · ${description.slice(0, 30)}${description.length > 30 ? '…' : ''}` : ''}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost flex-1 justify-center py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="btn-lime flex-1 justify-center py-3"
            >
              {loading ? (
                <span className="inline-flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {isEdit ? 'Saving…' : 'Creating…'}
                </span>
              ) : (
                isEdit ? 'Save changes →' : 'Create habit →'
              )}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
