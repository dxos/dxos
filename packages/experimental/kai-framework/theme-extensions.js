//
// Copyright 2023 DXOS.org
//

const colors = require('tailwindcss/colors');

// https://tailwindcss.com/docs/customizing-colors#aliasing-color-names
const primary = colors.sky;
const secondary = colors.blue;
const neutral = colors.zinc;

module.exports = {
  // https://tailwindcss.com/docs/theme#extending-the-default-theme
  kaiThemeExtension: {
    spacing: {
      sidebar: '300px',

      // Standardize column width for tiles (based on iPhone Pro 12).
      column: '390px',
    },

    listStyleType: {
      square: 'square',
      dash: '"-"',
    },

    // TODO(burdon): Levels.
    // TODO(burdon): Custom or redefine what shadow-md means?
    // https://tailwindcss.com/docs/box-shadow
    boxShadow: {
      1: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    },

    // TODO(burdon): Naming scheme (for theme: e.g., dark:bg-dark-toolbar-bg).
    // https://m2.material.io/design/color/the-color-system.html#color-theme-creation
    // https://m3.material.io/styles/color/dynamic-color/overview
    colors: {
      appbar: {
        header: primary[500],
        toolbar: primary[300],
      },

      paper: {
        bg: 'white',
        text: 'black',
        border: neutral[300],
        1: {
          bg: neutral[50],
          text: neutral[700],
        },
        2: {
          bg: neutral[100],
          text: neutral[600],
        },
        3: {
          bg: neutral[200],
          text: neutral[500],
        },
        4: {
          bg: neutral[300],
          text: neutral[400],
        },
      },

      sidebar: {
        bg: neutral[50],
      },

      selection: {
        bg: neutral[100],
        text: neutral[700],
        marker: secondary[400],
        border: secondary[300],
      },

      hover: {
        bg: secondary[100],
        text: secondary[700],
        border: secondary[300],
      },

      secondary: {
        text: secondary[700],
      },

      table: {
        rowEven: neutral[50],
        rowOdd: neutral[100],
      },
    },
  },
};
