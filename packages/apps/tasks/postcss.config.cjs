//
// Copyright 2023 DXOS.org
//

/* postcss.config.js */
const path = require('path');

module.exports = {
  plugins: {
    autoprefixer: {},
    tailwindcss: {
      config: path.join(__dirname, 'tailwind.config.js'),
    },
  },
};
