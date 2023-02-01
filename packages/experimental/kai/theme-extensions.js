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
      // TODO(burdon): Externalize numerical constant for computed layout geometry.
      // TODO(burdon): Define as media breakpoint?
      column: '390px'
    }
  }
};
