/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Core palette ──────────────────────────────────────────────────
        canvas:  '#F5F5F3',           // off-white background
        ink:     '#0F0F0F',           // near-black primary text
        muted:   '#6B6B6B',           // secondary text
        border:  '#E0E0E0',           // divider lines
        surface: '#FFFFFF',           // card surfaces
        // ── Primary accent (lime green) ────────────────────────────────────
        lime: {
          DEFAULT: '#D4FF4F',
          hover:   '#C4EF3F',
          dark:    '#9DC200',
        },
        // ── Secondary accent (purple → blue gradient endpoints) ────────────
        purple: {
          DEFAULT: '#6C5CE7',
          light:   '#8B7CF8',
          dark:    '#5245CC',
        },
        sky: {
          DEFAULT: '#74C0FC',
          light:   '#A5D8FF',
        },
        // ── Dark overlay panels ────────────────────────────────────────────
        panel: {
          DEFAULT: '#111118',
          light:   '#1C1C2E',
          border:  'rgba(255,255,255,0.08)',
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', '"Archivo"', 'system-ui', 'sans-serif'],
        sans:    ['"Inter"',         'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"','monospace'],
      },
      fontSize: {
        '8xl': ['6rem',   { lineHeight: '1',    letterSpacing: '-0.03em' }],
        '7xl': ['4.5rem', { lineHeight: '1',    letterSpacing: '-0.03em' }],
        '6xl': ['3.75rem',{ lineHeight: '1',    letterSpacing: '-0.025em' }],
        '5xl': ['3rem',   { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        '4xl': ['2.25rem',{ lineHeight: '1.1',  letterSpacing: '-0.02em' }],
        '3xl': ['1.875rem',{lineHeight: '1.15', letterSpacing: '-0.015em' }],
      },
      borderRadius: {
        'pill': '9999px',
        '2xl':  '1rem',
        '3xl':  '1.25rem',
        '4xl':  '2rem',
      },
      boxShadow: {
        'card':       '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 24px rgba(0,0,0,0.10)',
        'lime':       '0 0 0 3px rgba(212,255,79,0.3)',
        'panel':      '0 24px 64px rgba(0,0,0,0.5)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #6C5CE7 0%, #74C0FC 100%)',
        'gradient-lime':   'linear-gradient(135deg, #D4FF4F 0%, #9DC200 100%)',
        'grid-pattern':    `
          linear-gradient(rgba(108,92,231,0.07) 1px, transparent 1px),
          linear-gradient(90deg, rgba(108,92,231,0.07) 1px, transparent 1px)
        `,
      },
      backgroundSize: {
        'grid': '32px 32px',
      },
      animation: {
        'fade-up':    'fadeUp 0.5s ease-out both',
        'fade-in':    'fadeIn 0.4s ease-out both',
        'float':      'float 6s ease-in-out infinite',
        'pulse-lime': 'pulseLime 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        pulseLime: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212,255,79,0.4)' },
          '50%':      { boxShadow: '0 0 0 8px rgba(212,255,79,0)' },
        },
      },
    },
  },
  plugins: [],
};
