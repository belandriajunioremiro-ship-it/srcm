/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        institutional: {
          navy: '#1E3A8A',
          slate: '#475569',
          gold: '#8C7B68',
        },
        background: {
          light: '#F9F7F2',
          lighter: '#F4F1EA',
          grey: '#F3F4F6',
        },
        text: {
          main: '#1A1A1A',
          charcoal: '#333333',
        }
      }
    },
  },
  plugins: [],
};
