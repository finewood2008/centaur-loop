/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        terracotta: '#C0755A',
        'near-black': '#1A1A1A',
        'olive-gray': '#6B6B5E',
        'stone-gray': '#9B9B8F',
        'warm-sand': '#E8DCCA',
        ivory: '#FAF7F2',
        parchment: '#F5F0E8',
        'sage-green': '#7A9E7E',
        'amber-warm': '#D4A843',
        'border-cream': '#E5DDD0',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
