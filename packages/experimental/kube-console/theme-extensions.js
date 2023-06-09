//
// Copyright 2023 DXOS.org
//

const colors = require('tailwindcss/colors');

const { osThemeExtension } = require('@dxos/react-shell/theme-extensions');

module.exports = {
  osThemeExtension: {
    ...osThemeExtension,
    spacing: {
      sidebar: '300px',
    },
  },

  // TODO(burdon): Use pattern from r-c.
  // https://tailwindcss.com/docs/theme#extending-the-default-theme
  consoleThemeExtension: {
    colors: {
      paper: {
        bg: colors.neutral[200],
      },
      sidebar: {
        bg: colors.neutral[200],
      },
      highlight: {
        bg: colors.neutral[300],
      },
      secondary: {
        bg: colors.green[300],
      },

      // Dark.
      dark: {
        paper: {
          bg: colors.neutral[900],
        },
        sidebar: {
          bg: colors.neutral[800],
        },
        highlight: {
          bg: colors.neutral[700],
        },
        secondary: {
          bg: colors.green[700],
        },
      },
    },
  },
};
