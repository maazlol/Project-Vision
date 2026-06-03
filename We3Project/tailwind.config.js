/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./impactfeed.html",
    "./dashboard.html",
    "./login.html",
    "./news.html",
    "./settings.html",
    "./verify.html",
    "./about.html",
    "./blog.html",
    "./sponsor.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#10b981',
          dark: '#059669',
        }
      }
    },
  },
  plugins: [],
}

