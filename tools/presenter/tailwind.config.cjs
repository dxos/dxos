//
// Copyright 2022 DXOS.org
//

// TODO(burdon): Create TS plugin (see @dxos/react-ui)

const tailwindcss = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    // './node_modules/tw-elements/dist/js/**/*.js'
  ],

  // https://tailwindcss.com/docs/theme#customizing-the-default-theme
  // https://tailwindcss.com/docs/plugins#adding-base-styles
  theme: {
    fontFamily: {
      // 'body': ['Roboto FlexVariable'],
      'mono': ['monospace'],
    },

    // Referenced in style.css
    // https://tailwindcss.com/docs/preflight#lists-are-unstyled
    listStyleType: {
      square: 'square'
    },

    // https://tailwindcss.com/docs/customizing-spacing
    spacing: {
      '1': '32px',
      '2': '64px',
      '3': '128px',
      '4': '256px'
    }
  },

  // https://tailwindcss.com/docs/plugins
  plugins: [
    // require('@tailwindcss/aspect-ratio'),

    // https://tailwindcss.com/docs/typography-plugin
    // require('@tailwindcss/typography'),

    // https://tailwind-elements.com/quick-start
    // require('tw-elements/dist/plugin'),

    tailwindcss(function({ addBase, theme }) {
      addBase({
        'h1': { fontSize: theme('fontSize.8xl') },
        'h2': { fontSize: theme('fontSize.7xl') },
        'h3': { fontSize: theme('fontSize.6xl') },
        'body': { fontSize: theme('fontSize.6xl') },
        'code': { fontSize: theme('fontSize.3xl') },
      })
    })
  ]
}

