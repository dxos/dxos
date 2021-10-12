//
// Copyright 2020 DXOS.org
//

import { colors, createTheme as createMuiTheme, CssBaseline, ThemeProvider } from '@mui/material';
import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

// https://material-ui.com/customization/theming
export const defaultThemeProperties = {
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

  // TODO(burdon): DXOS Palette.
  palette: {
    primary: colors.blue,
    secondary: colors.blueGrey
  }
};

export const createTheme = (base: any) => createMuiTheme(defaultsDeep(base, defaultThemeProperties));

export const ReactUXTheme = ({ children, base }: { base: any; children: React.ReactNode }) => (
  <ThemeProvider theme={createTheme(base)}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);
