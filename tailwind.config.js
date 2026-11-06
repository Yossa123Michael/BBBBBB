/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          400: '#F3C06B',
          500: '#D4AF37',
          600: '#AA820A',
        }
      }
    },
  },
  plugins: [],
}