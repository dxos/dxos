//
// Copyright 2022 DXOS.org
//

import { colors, createTheme } from '@mui/material';

//
// NOTE: tailwind expects this file at the root.
//

export const theme = createTheme({
  palette: {
    primary: {
      main: colors.blueGrey[500]
    },
    secondary: {
      main: colors.teal[500]
    }
  },
  typography: {
    fontSize: 12
  },
  components: {
    MuiButtonBase: {
      defaultProps: {
        disableRipple: true
      }
    },
    MuiToolbar: {
      defaultProps: {
        disableGutters: true,
        variant: 'dense'
      },
      styleOverrides: {
        root: {
          '.MuiButton-root': {
            margin: '0 4px'
          }
        }
      }
    }
  }
});
