import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        motion: {
          bg: '#000000',
          surface: '#121214',
          card: '#1E1E24',
          primary: '#10B981', // Emerald for success/active states
          kinetic: '#06B6D4', // Cyan for motion/waves
          accent: '#8B5CF6',  // Violet for focus states
        }
      },
    },
  },
  plugins: [],
} satisfies Config;