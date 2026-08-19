// ─── Habit icon set ────────────────────────────────────────────────────────
// A small, consistent set of line icons for habit categories — replaces
// emoji, which render inconsistently across platforms (and can look
// unpolished/placeholder-ish) and don't take a stroke color the way these
// do, so they read as one designed system rather than picked-from-a-picker.
import type { SVGProps } from 'react';

export type HabitIconName =
  | 'flame' | 'book' | 'run' | 'meditate' | 'water' | 'barbell'
  | 'pen' | 'star' | 'moon' | 'apple' | 'music' | 'code';

export const HABIT_ICON_NAMES: HabitIconName[] = [
  'flame', 'book', 'run', 'meditate', 'water', 'barbell',
  'pen', 'star', 'moon', 'apple', 'music', 'code',
];

type IconProps = SVGProps<SVGSVGElement>;

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Flame(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M12 21c3.5 0 6-2.24 6-5.6 0-2.4-1.5-4-2.6-5.4.1 1.5-.7 2.5-1.4 2.5-.8 0-1.3-.7-1.2-1.6.2-1.8-.6-3.7-2.3-4.9.3 1.8-.4 3-1.6 4.4C7.6 11.9 7 13.2 7 14.8 7 18.4 8.5 21 12 21Z" />
    </svg>
  );
}
function Book(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5c1.8-1 4.3-1 6 0 .7.4 1.3 1 2 1 .7 0 1.3-.6 2-1 1.7-1 4.2-1 6 0v13c-1.8-1-4.3-1-6 0-.7.4-1.3 1-2 1-.7 0-1.3-.6-2-1-1.7-1-4.2-1-6 0Z" />
      <path d="M12 6.5V19" />
    </svg>
  );
}
function Run(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="14" cy="4.5" r="1.75" />
      <path d="M9 21l2.2-5 2-1.8 2 4.3 3.3 1.5" />
      <path d="M6.5 15.5 9 13l2-3-1-3.2L6 8" />
      <path d="M11 10l2.5 2.2 3.5-.7" />
    </svg>
  );
}
function Meditate(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="5.5" r="1.75" />
      <path d="M12 9v3.5" />
      <path d="M7 20c0-3 2-4.5 3.3-5.3.9-.5 1.5-1.2 1.7-2.2.2 1 .8 1.7 1.7 2.2C15 15.5 17 17 17 20" />
      <path d="M4 20h16" />
    </svg>
  );
}
function Water(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M12 3c3 3.8 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 3-7.2 6-11Z" />
    </svg>
  );
}
function Barbell(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M4 10v4" /><path d="M2 9v6" />
      <path d="M7 8v8" />
      <path d="M7 12h10" />
      <path d="M17 8v8" />
      <path d="M22 9v6" /><path d="M20 10v4" />
    </svg>
  );
}
function Pen(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M4 20l.9-3.6a2 2 0 0 1 .53-.94l10.4-10.4a1.5 1.5 0 0 1 2.12 0l1.08 1.08a1.5 1.5 0 0 1 0 2.12L8.6 18.56a2 2 0 0 1-.94.53L4 20Z" />
      <path d="M13.5 6.5l4 4" />
    </svg>
  );
}
function Star(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5l2.4 5 5.4.6-4 3.8 1 5.4-4.8-2.6-4.8 2.6 1-5.4-4-3.8 5.4-.6Z" />
    </svg>
  );
}
function Moon(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M20 14.2A8 8 0 1 1 9.8 4a6.4 6.4 0 0 0 10.2 10.2Z" />
    </svg>
  );
}
function Apple(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M12 8.5c1-1.3 2.5-1.8 4-1.3-1 .3-1.8 1-2.3 1.8 2 .2 3.8 1.9 3.8 4.6 0 3.3-2.3 6.9-4.9 6.9-.9 0-1.2-.5-2-.5s-1.2.5-2.1.5C6 20.5 4 16.7 4 13.6c0-2.9 2-4.9 4.2-4.9.9 0 1.6.5 2.3.5.4 0 .8-.2 1.2-.4Z" />
      <path d="M12 8.5V6c0-.8.5-1.5 1.5-1.8" />
    </svg>
  );
}
function Music(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M9 18a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
      <path d="M18 16.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z" />
      <path d="M11.5 15.5V5.5L20.5 4v9" />
    </svg>
  );
}
function Code(props: IconProps): JSX.Element {
  return (
    <svg {...base} {...props}>
      <path d="M9 7 4 12l5 5" />
      <path d="M15 7l5 5-5 5" />
    </svg>
  );
}

const ICON_COMPONENTS: Record<HabitIconName, (props: IconProps) => JSX.Element> = {
  flame: Flame, book: Book, run: Run, meditate: Meditate, water: Water, barbell: Barbell,
  pen: Pen, star: Star, moon: Moon, apple: Apple, music: Music, code: Code,
};

export function HabitIcon({ icon, ...props }: { icon: string } & IconProps): JSX.Element {
  const Cmp = ICON_COMPONENTS[icon as HabitIconName] ?? Flame;
  return <Cmp {...props} />;
}
