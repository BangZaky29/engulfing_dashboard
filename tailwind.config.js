/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a', // slate-900
        card: '#1e293b', // slate-800
        text: '#f8fafc', // slate-50
        muted: '#94a3b8', // slate-400
        primary: '#38bdf8', // sky-400 (light blue)
        success: '#34d399', // emerald-400 (soft green)
        danger: '#fb7185', // rose-400 (soft red)
      }
    },
  },
  plugins: [],
}
