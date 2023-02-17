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

  // Geometry:
  // - Icons: 24x24
  // - Default: 2.5rem/40px line-height.
  // - Dense: 2rem/36px line-height.
  // - 1.5rem/24px line-height for menus/compact buttons; 28px with padding.

  // https://tailwindcss.com/docs/theme#extending-the-default-theme
  kaiThemeExtension: {
    spacing: {
      appbar: '48px',
      toolbar: '40px', // 32px line height + padding
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
      appbar: {
        header: colors.sky[500],
        toolbar: colors.sky[300]
      },

      paper: {
        bg: 'white',
        text: 'black',
        1: {
          bg: neutral[50],
          text: neutral[700]
        },
        2: {
          bg: neutral[100],
          text: neutral[600]
        },
        3: {
          bg: neutral[200],
          text: neutral[500]
        },
        4: {
          bg: neutral[300],
          text: neutral[400]
        }
      },

      sidebar: {
        bg: neutral[50]
      },

      selection: {
        // TODO(burdon): 'selected'
        hover: secondary[100],
        bg: secondary[200],
        text: secondary[700],
        border: secondary[300]
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
