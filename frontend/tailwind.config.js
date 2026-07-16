/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#080C18',
        surface: '#0E1425',
        card:    '#121929',
        border:  '#1C2A42',
        accent:  '#4F8EF7',
        accent2: '#A78BFA',
        neon:    '#34D399',
        warn:    '#FBBF24',
        danger:  '#F87171',
        muted:   '#5A6A85',
        text:    '#D4DEF0',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        display: ['"Syne"', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.3s ease-out forwards',
        'spin-slow':'spin 3s linear infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' },                           to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      }
    }
  },
  plugins: []
}