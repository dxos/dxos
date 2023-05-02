//
// Copyright 2023 DXOS.org
//

const { kaiThemeExtension } = require('@dxos/kai-framework/theme-extensions');
const { osThemeExtension } = require('@dxos/react-shell/theme-extensions');

module.exports = {
  osThemeExtension: {
    ...osThemeExtension,
    spacing: {
      sidebar: '300px'
    }
  },

  kaiThemeExtension: {
    ...kaiThemeExtension
  }
};
