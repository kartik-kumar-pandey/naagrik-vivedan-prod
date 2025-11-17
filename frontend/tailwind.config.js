/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7fe',
          300: '#a5b8fc',
          400: '#818cf8',
          500: '#667eea',
          600: '#5a67d8',
          700: '#4c51bf',
          800: '#434190',
          900: '#3c366b',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        modern: '0 20px 60px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.5)',
        'modern-hover': '0 25px 70px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.6)',
        glow: '0 0 20px rgba(59, 130, 246, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-in-right': 'slideInRight 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};

