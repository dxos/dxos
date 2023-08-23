//
// Copyright 2023 DXOS.org
//

const path = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [path.join(__dirname, './src/**/*.{js,ts,jsx,tsx}'), path.join(__dirname, './index.html')],
  theme: {
    extend: {},
  },
  plugins: [],
};
