//
// Copyright 2023 DXOS.org
//

const { osThemeExtension } = require('@dxos/react-ui/theme-extensions');

module.exports = {
  osThemeExtension: {
    ...osThemeExtension,
    spacing: {
      sidebar: '300px'
    }
  },

  // https://tailwindcss.com/docs/theme#extending-the-default-theme
  consoleThemeExtension: {}
};
