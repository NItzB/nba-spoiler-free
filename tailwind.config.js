/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg: {
          primary: '#0a0a1a',
          secondary: '#111128',
          card: '#16163a',
          hover: '#1e1e4a',
        },
        accent: {
          fire: '#ff6b35',
          great: '#4a9eff',
          decent: '#a78bfa',
          skip: '#475569',
        },
        nba: {
          orange: '#ff6b35',
          blue: '#1d428a',
          gold: '#fbbf24',
        },
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'score-reveal': 'score-reveal 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 10px rgba(255, 107, 53, 0.4), 0 0 20px rgba(255, 107, 53, 0.2)' },
          '50%': { boxShadow: '0 0 20px rgba(255, 107, 53, 0.8), 0 0 40px rgba(255, 107, 53, 0.4), 0 0 60px rgba(255, 107, 53, 0.2)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'score-reveal': {
          from: { filter: 'blur(8px)', opacity: '0' },
          to: { filter: 'blur(0)', opacity: '1' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      boxShadow: {
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'card-hover': '0 8px 40px rgba(0, 0, 0, 0.6)',
        'fire': '0 0 20px rgba(255, 107, 53, 0.6), 0 0 40px rgba(255, 107, 53, 0.3)',
        'great': '0 0 20px rgba(74, 158, 255, 0.4), 0 0 40px rgba(74, 158, 255, 0.2)',
        'inner-glow': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
}
