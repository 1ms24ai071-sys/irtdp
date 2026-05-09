/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        neon: '#6FFF00',
        cream: '#EFF4FF',
      },
      fontFamily: {
        mono: ['"Share Tech Mono"', 'monospace'],
        grotesk: ['"Space Grotesk"', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
