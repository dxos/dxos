//
// Copyright 2023 DXOS.org
//

const colors = require('tailwindcss/colors');

const { osThemeExtension } = require('@dxos/react-ui/theme-extensions');

// https://tailwindcss.com/docs/customizing-colors#aliasing-color-names
const primary = colors.sky;
const secondary = colors.stone;
const neutral = colors.zinc;

module.exports = {
  osThemeExtension: {
    ...osThemeExtension,
    spacing: {
      sidebar: '390px'
    }
  },

  // https://tailwindcss.com/docs/theme#extending-the-default-theme
  kaiThemeExtension: {
    spacing: {
      appbar: '48px',
      toolbar: '40px',
      header: '88px', // Combined height of appbar and toolbar (pbs-header).

      // Standardize column width for tiles (based on iPhone Pro 12).
      column: '390px'
    },

    // TODO(burdon): Levels.
    // TODO(burdon): Custom or redefine what shadow-md means?
    // https://tailwindcss.com/docs/box-shadow
    boxShadow: {
      1: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
    },

    // TODO(burdon): Naming scheme (for theme: e.g., dark:bg-dark-toolbar-bg).
    // https://m2.material.io/design/color/the-color-system.html#color-theme-creation
    // https://m3.material.io/styles/color/dynamic-color/overview
    colors: {
      paper: {
        bg: 'white',
        1: {
          bg: neutral[50],
          text: 'black'
        },
        2: {
          bg: neutral[100],
          text: 'black'
        },
        3: {
          bg: neutral[200],
          text: 'black'
        },
        4: {
          bg: neutral[300],
          text: 'black'
        }
      },

      appbar: {
        header: primary[500],
        toolbar: primary[300]
      },

      sidebar: {
        bg: neutral[200]
      },

      selection: {
        // TODO(burdon): 'selected'
        hover: secondary[200],
        bg: secondary[300],
        text: secondary[700],
        border: secondary[400]
      },

      secondary: {
        text: secondary[700]
      },

      table: {
        rowEven: neutral[50],
        rowOdd: neutral[100]
      }
    }
  }
};
