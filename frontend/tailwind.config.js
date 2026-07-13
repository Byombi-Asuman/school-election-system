/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d5ff',
          300: '#a3b8ff',
          400: '#7c8ffc',
          500: '#5a67f7',
          600: '#4045eb',
          700: '#3534cf',
          800: '#2c2ca7',
          900: '#2a2b84',
          950: '#1a1a52',
        },
        slate: {
          850: '#172033',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Lexend', 'Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'splash-in': 'splash-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'splash-glow': 'splash-glow 2s ease-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { transform: 'translateY(10px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        'splash-in': {
          '0%': { opacity: '0', transform: 'scale(0.85) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
      },
      'splash-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255,255,255,0.15)' },
          '50%': { boxShadow: '0 0 0 12px rgba(255,255,255,0)' },
        },
      },
    },
  },
  plugins: [],
};
