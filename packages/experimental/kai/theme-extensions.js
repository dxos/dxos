//
// Copyright 2023 DXOS.org
//

const colors = require('tailwindcss/colors');

const { osThemeExtension } = require('@dxos/react-ui/theme-extensions');

// https://tailwindcss.com/docs/customizing-colors#aliasing-color-names
const primary = colors.orange; // teal
const secondary = colors.stone;

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

    // TODO(burdon): Themes: light/dark.
    // TODO(burdon): Naming scheme?
    colors: {
      appbar: {
        header: primary[400],
        toolbar: primary[500]
      },
      toolbar: {
        bg: colors.slate[200]
      },
      sidebar: {
        bg: colors.zinc[100]
      },
      // TODO(burdon): Mui Paper?
      panel: {
        bg: colors.zinc[300],
        border: colors.zinc[300]
      },
      selection: {
        hover: secondary[100],
        bg: secondary[200],
        text: secondary[500],
        border: secondary[400]
      }
    }
  }
};
