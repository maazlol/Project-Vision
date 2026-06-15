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
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        }
      },
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

