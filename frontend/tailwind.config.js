/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          light: '#EAF1FF',   // page background
          primary: '#8B5CF6', // primary accent
          600: '#7C3AED',     // hover
          700: '#6D28D9',     // active / pressed
          ink: '#1E1B4B',     // text on light backgrounds (deep indigo, passes AA on #EAF1FF)
        },
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
