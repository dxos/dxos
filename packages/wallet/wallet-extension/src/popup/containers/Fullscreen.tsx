//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { createTheme as createMuiTheme, ThemeProvider, CssBaseline } from '@mui/material';

import { FullScreen as FullScreenComponent } from '@dxos/react-components';

import { Root } from './Root';

const baseTheme = createMuiTheme({
  components: {
    MuiCssBaseline: {
      'styleOverrides': {
        body: {
          margin: 0,
          overflow: 'hidden'
        }
      }
    }
  }
});

export const Fullscreen = () => (
  <ThemeProvider theme={baseTheme}>
    <CssBaseline />
    <FullScreenComponent>
      <Root />
    </FullScreenComponent>
  </ThemeProvider>
);
