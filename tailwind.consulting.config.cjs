/**
 * Tailwind config for the consulting static site.
 * Mirrors the inline Tailwind config previously embedded in each HTML file.
 */
const path = require('path');

module.exports = {
  content: [
    path.resolve(__dirname, 'consulting/**/*.html'),
    path.resolve(__dirname, 'consulting/**/*.js'),
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
          950: '#0a192f',
        },
        slate: {
          850: '#1e293b',
        },
      },
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
