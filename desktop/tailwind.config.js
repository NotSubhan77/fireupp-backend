/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#ff5722',
          hover: '#f4511e',
          glow: 'rgba(255, 87, 34, 0.4)'
        },
        dark: {
          950: '#08090e',
          900: '#0d0f18',
          850: '#121522',
          800: '#171b2c',
          700: '#23283f',
          600: '#323957'
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
