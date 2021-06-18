//
// Copyright 2020 DXOS.org
//

import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

import { CssBaseline } from '@material-ui/core';
import primary from '@material-ui/core/colors/blue';
import secondary from '@material-ui/core/colors/blueGrey';
import { MuiThemeProvider, createMuiTheme } from '@material-ui/core/styles';

// https://material-ui.com/customization/theming
export const defaultThemeProperties = {
  props: {
    MuiAppBar: {
      elevation: 0,
    },

    MuiButtonBase: {
      disableRipple: true,
    },
  },

  overrides: {
    MuiCssBaseline: {
      '@global': {
        body: {
          overflow: 'hidden', // Prevent scroll bounce.
        },
      },
    },
  },

  // TODO(burdon): DXOS Palette.
  palette: {
    primary,
    secondary,
  },
};

export const createTheme = (base: any) => {
  console.log(defaultsDeep(base, defaultThemeProperties));
  const a = createMuiTheme(defaultsDeep(base, defaultThemeProperties));
  console.log({ a });
  return a;
};

// TODO(burdon): Rename ThemeProvider or Remove.
const Theme = ({ children, base }: { base: any; children: React.ReactNode }) => (
  <MuiThemeProvider theme={createTheme(base)}>
    <CssBaseline />
    {children}
  </MuiThemeProvider>
);

export default Theme;
