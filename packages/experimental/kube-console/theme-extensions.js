//
// Copyright 2023 DXOS.org
//

const colors = require('tailwindcss/colors');

const { osThemeExtension } = require('@dxos/react-ui/theme-extensions');

module.exports = {
  osThemeExtension: {
    ...osThemeExtension,
    spacing: {
      sidebar: '300px'
    }
  },

  // TODO(burdon): Use pattern from r-c.
  // https://tailwindcss.com/docs/theme#extending-the-default-theme
  consoleThemeExtension: {
    colors: {
      paper: {
<<<<<<< HEAD
        bg: colors.neutral[300]
=======
        bg: colors.neutral[200]
>>>>>>> main
      },
      sidebar: {
        bg: colors.neutral[200]
      },
      highlight: {
<<<<<<< HEAD
        bg: colors.neutral[100]
=======
        bg: colors.neutral[300]
      },
      secondary: {
        bg: colors.green[300]
>>>>>>> main
      },

      // Dark.
      dark: {
        paper: {
          bg: colors.neutral[900]
        },
        sidebar: {
          bg: colors.neutral[800]
        },
        highlight: {
          bg: colors.neutral[700]
<<<<<<< HEAD
=======
        },
        secondary: {
          bg: colors.green[700]
>>>>>>> main
        }
      }
    }
  }
};
