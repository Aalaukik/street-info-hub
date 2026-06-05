/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff8ed',
          100: '#ffefd4',
          200: '#ffdc9f',
          300: '#ffc266',
          400: '#ff9d2e',
          500: '#f97f09',
          600: '#ea6104',
          700: '#c24507',
          800: '#9a360d',
          900: '#7c2e0e',
        },
        road: {
          dark:   '#0d1117',
          card:   '#161b22',
          border: '#21262d',
          muted:  '#8b949e',
        },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
        mono:    ['DM Mono', 'monospace'],
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease forwards',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        pulseDot: {
          '0%, 100%': { transform: 'scale(1)', opacity: 1 },
          '50%':      { transform: 'scale(1.4)', opacity: 0.7 },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
}
