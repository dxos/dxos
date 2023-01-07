//
// Copyright 2021 DXOS.org
//

import React, { ReactNode } from 'react';

import { createTheme, ThemeProvider as MuiThemeProvider } from '@mui/material';

const theme = createTheme({
  components: {
    MuiButton: {
      defaultProps: {
        size: 'small'
      },
      styleOverrides: {
        root: {
          marginRight: 4
        }
      }
    },
    MuiTextField: {
      defaultProps: {
        size: 'small'
      }
    },
    MuiToolbar: {
      defaultProps: {
        variant: 'dense',
        disableGutters: true
      }
    }
  }
});

// TODO(burdon): Add theme as decorator.
export const ThemeProvider = ({ children }: { children: ReactNode }) => (
  <MuiThemeProvider theme={theme}>{children}</MuiThemeProvider>
);
