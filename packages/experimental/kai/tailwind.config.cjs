//
// Copyright 2022 DXOS.org
//

// https://tailwindcss.com/docs/configuration

const tailwindcss = require('tailwindcss/plugin');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],

  // https://tailwindcss.com/docs/scroll-margin#customizing-your-theme
  theme: {},

  // https://tailwindcss.com/docs/plugins
  plugins: [
    tailwindcss(function({ addBase, theme }) {})
  ]
}
