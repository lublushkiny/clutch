/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        orange: {
          400: '#F97316',
          500: '#EA580C',
          600: '#D95309',
          700: '#C2410C',
        },
      },
    },
  },
  plugins: [],
}
