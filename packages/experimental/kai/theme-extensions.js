//
// Copyright 2023 DXOS.org
//

const { osThemeExtension } = require('@dxos/react-ui/theme-extensions');

module.exports = {
  osThemeExtension: {
    ...osThemeExtension,
    spacing: {
      sidebar: '280px'
    }
  },

  kaiThemeExtension: {
    spacing: {
      appbar: '48px',
      toolbar: '40px',
      header: '88px', // Combined height of appbar and toolbar.

      // Standardize column width (based on iPhone Pro 12).
      column: '390px'
    },

    colors: {
      // TODO(burdon): Naming scheme?
      dark: {
        selection: {
          bg: 'orange', // dark:bg-dark-selection-bg bg-selection-bg
          fg: 'black'
        }
      }
    }
  }
};
