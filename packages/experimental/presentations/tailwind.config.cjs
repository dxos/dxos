/** @type {import('tailwindcss').Config} */

const plugin = require('tailwindcss/plugin')

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    fontFamily: {
      body: ['Roboto FlexVariable']
    },
    extend: {},
  },

  // https://tailwindcss.com/docs/plugins#adding-base-styles
  plugins: [
    plugin(function({ addBase, theme }) {
      addBase({
        'h1': { fontSize: theme('fontSize.5xl') },
        'h2': { fontSize: theme('fontSize.3xl') },
        'h3': { fontSize: theme('fontSize.1xl') },
        'h4': { fontSize: theme('fontSize.lg') },
      })
    })
  ]
}
