//
// Copyright 2023 DXOS.org
//

const colors = require('tailwindcss/colors');

const { osThemeExtension } = require('@dxos/react-ui/theme-extensions');

// https://tailwindcss.com/docs/customizing-colors#aliasing-color-names
const primary = colors.orange;
const secondary = colors.slate;
const neutral = colors.zinc;

module.exports = {
  osThemeExtension: {
    ...osThemeExtension,
    spacing: {
      sidebar: '390px'
    }
  },

  kaiThemeExtension: {
    spacing: {
      appbar: '48px',
      toolbar: '40px',
      header: '88px', // Combined height of appbar and toolbar (pbs-header).

      // Standardize column width for tiles (based on iPhone Pro 12).
      column: '390px'
    },

    // TODO(burdon): Naming scheme (for theme: e.g., dark:bg-dark-toolbar-bg).
    colors: {
      appbar: {
        header: primary[400],
        toolbar: primary[500]
      },
      toolbar: {
        bg: neutral[300]
      },
      sidebar: {
        bg: neutral[200]
      },
      // TODO(burdon): Mui Paper?
      panel: {
        bg: neutral[100],
        border: neutral[300]
      },
      selection: {
        hover: secondary[200],
        bg: secondary[300],
        text: secondary[700],
        border: secondary[600]
      }
    }
  }
};
