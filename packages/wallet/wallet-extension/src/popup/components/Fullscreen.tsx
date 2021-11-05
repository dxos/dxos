//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { CssBaseline, ThemeProvider, createMuiTheme } from '@material-ui/core';

import Root from './Root';

const baseTheme = createMuiTheme({
  overrides: {
    MuiCssBaseline: {
      '@global': {
        body: {
          margin: 0,
          overflow: 'hidden'
        }
      }
    }
  }
});

const Fullscreen = () => {
  return (
    <ThemeProvider theme={baseTheme}>
      <CssBaseline />
      <Root />
    </ThemeProvider>
  );
};

export default Fullscreen;
