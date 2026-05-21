/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-primary': '#F5F3EE',
        'surface-secondary': '#C8DBBC',
        'surface-inverse': '#1B3A28',
        'surface-card': '#FFFFFF',
        'fg-primary': '#1B3A28',
        'fg-secondary': '#4A6B52',
        'fg-muted': '#7A9A80',
        'fg-inverse': '#FFFFFF',
        'accent-primary': '#2D5E3A',
        'accent-lime': '#C8FF6B',
        'accent-money': '#3FA85C',
        warning: '#E07B3C',
        'border-soft': '#E5E0D6',
      },
      fontFamily: {
        h: ['Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        data: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg: '8px',
        xl: '12px',
        '2xl': '20px',
        '3xl': '28px',
        full: '9999px',
      },
      letterSpacing: {
        tightest: '-0.06em',
      },
    },
  },
  plugins: [],
};
