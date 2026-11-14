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
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0284c7',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49'
        },
        flood: {
          warning: '#f59e0b',
          danger: '#ef4444',
          safe: '#10b981',
          siaga1: '#dc2626',
          siaga2: '#ea580c',
          siaga3: '#eab308',
          siaga4: '#16a34a',
        }
      }
    },
  },
  plugins: [],
}
