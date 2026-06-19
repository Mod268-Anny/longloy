/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef9f3',
          100: '#fdf0e6',
          200: '#fae6d3',
          300: '#f7d4b3',
          400: '#f3b881',
          500: '#d97706', // Main accent - amber
          600: '#b45309',
          700: '#92400e', // Dark brown
          800: '#78350f',
          900: '#451a03',
        },
        brown: {
          50: '#fef9f3',
          100: '#f3ebe0',
          200: '#e8ddd0',
          300: '#dcc9b8',
          400: '#c9aca0',
          500: '#a85f23',
          600: '#92400e',
          700: '#7c2d12',
          800: '#65210f',
          900: '#4c1607',
        },
        gold: {
          50: '#fefce8',
          100: '#fffbeb',
          200: '#fef3c7',
          300: '#fde68a',
          400: '#fcd34d',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'sans-serif'],
        display: ['-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 8px rgba(0, 0, 0, 0.08)',
        'base': '0 4px 12px rgba(0, 0, 0, 0.1)',
        'lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'xl': '0 12px 32px rgba(0, 0, 0, 0.15)',
      },
      borderRadius: {
        'sm': '6px',
        'base': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
}


