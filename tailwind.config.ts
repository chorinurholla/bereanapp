import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold:    '#c9a84c',
        gold2:   '#e8c96d',
        navy:    '#1B3A6B',
        berean: {
          bg:       '#080b10',
          surface:  '#0e1420',
          surface2: '#141c2e',
          surface3: '#1a2338',
        }
      },
      fontFamily: {
        cinzel: ['Cinzel', 'serif'],
        mono:   ['JetBrains Mono', 'Consolas', 'monospace'],
        serif:  ['Georgia', 'Times New Roman', 'serif'],
      },
      animation: {
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'thinking':   'thinking 1.2s ease-in-out infinite',
        'fade-up':    'fade-up 0.3s ease forwards',
      },
    },
  },
  plugins: [],
}

export default config
