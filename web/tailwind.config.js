/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fdf4ff',
          100: '#fae8ff',
          200: '#f3d0fe',
          300: '#e9aafb',
          400: '#d878f6',
          500: '#c44de8',
          600: '#a92ecb',
          700: '#8c24a6',
          800: '#751f88',
          900: '#611c6f',
          950: '#3e0649',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-once': 'pulse 0.3s ease-in-out',
        'bounce-sm': 'bounce-sm 0.2s ease-in-out',
      },
      keyframes: {
        'bounce-sm': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.92)' },
        },
      },
    },
  },
  plugins: [],
}
