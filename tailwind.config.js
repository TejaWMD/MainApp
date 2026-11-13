/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        palette: {
          darkGreen: '#193116',
          sage: '#b4ad8f',
          honey: '#bf944b',
          lightSage: '#bcbeab',
          terracotta: '#a55c2a',
          ruby: '#83121c',
          olive: '#a1a568',
          teal: '#1080a7',
          mustard: '#b99c41',
          creamBg: '#f8f8f5',
        }
      },
      borderRadius: {
        'bubbly': '2rem',
        'super': '2.5rem',
      },
      boxShadow: {
        'bubbly': '0 10px 25px -5px rgba(25, 49, 22, 0.08), 0 8px 10px -6px rgba(25, 49, 22, 0.05)',
        'bubbly-lg': '0 20px 35px -10px rgba(25, 49, 22, 0.12), 0 10px 15px -5px rgba(25, 49, 22, 0.06)',
      }
    },
  },
  plugins: [],
}
