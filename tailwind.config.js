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
          900: '#0F172A', // Deep ink navy
          800: '#1E293B', 
          700: '#334155',
          600: '#475569',
          500: '#64748B',
        },
        surface: {
          50: '#FAF9F6', // Warm off-white
          100: '#F5F4F0',
          200: '#E8E6DF',
          300: '#D6D3C8',
        },
        accent: {
          teal: '#0F766E', // Muted dark teal
          amber: '#B45309', // Restrained amber
          orange: '#C2410C',
          red: '#991B1B' // Muted dark red
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        editorial: ['Newsreader', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
        'float': '0 4px 12px -2px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.04)',
      }
    },
  },
  plugins: [],
}
