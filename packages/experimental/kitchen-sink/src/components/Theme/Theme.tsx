//
// Copyright 2020 DXOS.org
//

import React, { ReactNode } from 'react';

import {
  colors,
  createTheme,
  CssBaseline,
  ThemeProvider as MuiThemeProvider
} from '@mui/material';

// https://material-ui.com/customization/theming
export const defaultTheme = {
  components: {
    MuiAppBar: {
      defaultProps: {
        elevation: 0
      }
    },

    MuiToolbar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.blueGrey[50]
        }
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

export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <MuiThemeProvider theme={createTheme(defaultTheme)}>
    <CssBaseline />
    {children}
  </MuiThemeProvider>
);
