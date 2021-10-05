//
// Copyright 2020 DXOS.org
//

import { colors, createTheme as createMuiTheme, CssBaseline, ThemeProvider } from '@mui/material';
import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

// https://material-ui.com/customization/theming
export const defaultThemeProperties = {
  props: {
    MuiAppBar: {
      elevation: 0
    },

    MuiButtonBase: {
      disableRipple: true
    }
  },

  overrides: {
    MuiCssBaseline: {
      '@global': {
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
