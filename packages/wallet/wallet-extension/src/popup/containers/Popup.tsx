//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { createTheme as createMuiTheme, ThemeProvider, CssBaseline } from '@mui/material';

import { Root } from './Root';

const baseTheme = createMuiTheme({
  components: {
    MuiCssBaseline: {
      'styleOverrides': {
        body: {
          margin: 0,
          overflow: 'hidden',
          width: 600,
          height: 450
        }
      }
    }
  }
});

export const Popup = () => (
  <ThemeProvider theme={baseTheme}>
    <CssBaseline />
    <Root />
  </ThemeProvider>
);
