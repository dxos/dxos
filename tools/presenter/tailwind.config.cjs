//
// Copyright 2022 DXOS.org
//

// https://tailwindcss.com/docs/configuration
// TODO(burdon): Create TS plugin for re-use (see @dxos/react-ui).

const tailwindcss = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  // https://tailwindcss.com/docs/content-configuration
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
    './src/slides/**/*.mdx'
  ],

  // https://tailwindcss.com/docs/theme#customizing-the-default-theme
  // https://tailwindcss.com/docs/plugins#adding-base-styles
  // https://tailwindcss.com/docs/font-family#customizing-your-theme
  // TODO(burdon): Default font-weight.
  theme: {
    fontFamily: {
      'sans': ['"DM Mono"'],
      'mono': ['"DM Mono"'],
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
    // https://tailwindcss.com/docs/typography-plugin
    // require('@tailwindcss/typography'),

    // https://tailwind-elements.com/quick-start
    // require('tw-elements/dist/plugin'),

    tailwindcss(function({ addBase, theme }) {
      addBase({
        // TODO(burdon): Compare to Keynote.
        'h1': { fontSize: theme('fontSize.8xl') },  // #
        'h2': { fontSize: theme('fontSize.7xl') },  // ##
        'h3': { fontSize: theme('fontSize.6xl') },  // ###
        'body': { fontSize: theme('fontSize.5xl') },
        'code': { fontSize: theme('fontSize.4xl') },
      })
    })
  ]
}

