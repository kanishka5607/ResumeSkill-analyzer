/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#0B132B',
          900: '#101B35', // Midnight Navy
          800: '#182744', // Deep Navy
          700: '#22345A',
        },
        emerald: {
          DEFAULT: '#10B981',
          50: '#ECFDF5',
          100: '#D1FAE5', // Light Emerald
          500: '#10B981',
          600: '#059669',
          700: '#047857',
        },
        warm: {
          bg: '#F7F8FC',
        },
        text: {
          primary: '#172033',
          secondary: '#667085',
        },
        border: {
          subtle: '#E5E7EB',
        }
      },
    },
  },
  plugins: [],
}
