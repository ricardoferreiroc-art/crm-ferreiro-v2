/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#000499',
          dim: 'rgba(0,4,153,0.07)',
          mid: 'rgba(0,4,153,0.13)',
        },
        cream: {
          DEFAULT: '#f4f5f0',
          dark: '#eceee8',
        },
        ink: {
          DEFAULT: '#111118',
          2: '#4a4a5a',
          3: '#9494a8',
        },
      },
      fontFamily: {
        ui: ['"DM Sans"', 'system-ui', 'sans-serif'],
        serif: ['"DM Serif Display"', 'Georgia', 'serif'],
        rexton: ['Rexton', 'sans-serif'],
        baskerville: ['BaskervilleMT', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
