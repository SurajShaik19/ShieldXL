/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070b14',
          900: '#0c1322',
          800: '#141e34',
          700: '#1e2d4d',
        },
        charcoal: {
          900: '#121316',
          800: '#1c1d22',
          700: '#282a32',
          600: '#3a3d47',
        },
        cyan: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        }
      }
    },
  },
  plugins: [],
}
