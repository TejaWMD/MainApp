/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wmd: {
          navy: '#09234e',
          royal: '#10346e',
          gold: '#d49b27',
          amber: '#c68e1e',
          red: '#c81e2b',
          blue: '#0088cb',
          surface: '#f4f6fa',
          ink: '#09234e',
          muted: '#5b6b84',
        }
      },
      boxShadow: {
        'wmd-sm': '0 4px 14px -4px rgba(9, 35, 78, 0.08)',
        'wmd-md': '0 12px 28px -8px rgba(9, 35, 78, 0.12)',
        'wmd-lg': '0 20px 44px -12px rgba(9, 35, 78, 0.16)',
      }
    },
  },
  plugins: [],
}
