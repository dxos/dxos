//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';

import {
  colors,
  createTheme as createMuiTheme,
  ThemeOptions,
  Theme
} from '@mui/material';

// https://material-ui.com/customization/theming
const defaultThemeProperties: ThemeOptions = {
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0
      }
    },

    MuiButtonBase: {
      defaultProps: {
        disableRipple: true
      }
    },

    MuiCssBaseline: {
      styleOverrides: {
        body: {
          overflow: 'hidden' // Prevent scroll bounce.
        }
      }
    }
  },

  palette: {
    primary: colors.blue,
    secondary: colors.blueGrey
  }
};

export const createTheme = (base: ThemeOptions): Theme =>
  createMuiTheme(defaultsDeep(base, defaultThemeProperties));
