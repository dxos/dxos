//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

import { CssBaseline, ThemeProvider, createMuiTheme } from '@material-ui/core';
import primary from '@material-ui/core/colors/blue';
import secondary from '@material-ui/core/colors/blueGrey';

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
    primary,
    secondary
  }
};

export const createTheme = (base: any) => createMuiTheme(defaultsDeep(base, defaultThemeProperties));

const ReactUXTheme = ({ children, base }: { base: any; children: React.ReactNode }) => (
  <ThemeProvider theme={createTheme(base)}>
    <CssBaseline />
    {children}
  </ThemeProvider>
);

export default ReactUXTheme;
