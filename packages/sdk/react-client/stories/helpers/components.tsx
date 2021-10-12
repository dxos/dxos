//
// Copyright 2021 DXOS.org
//

import { createTheme, Box, ThemeProvider } from '@mui/material';
import React from 'react';

import { Client } from '@dxos/client';
import { Party } from '@dxos/echo-db';

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
export const TestTheme = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider theme={theme}>
    {children}
  </ThemeProvider>
);

export const JsonPanel = ({ value }: { value: any }) => {
  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all'
      }}
    >
      {JSON.stringify(value, undefined, 2)}
    </pre>
  )
};

export const ClientPanel = ({ client, parties = [] }: { client: Client, parties?: Party[] }) => {
  const data = {
    parties: parties.map(({ key }) => key.toHex())
  }

  return (
    <Box>
      <Box sx={{ padding: 1 }}>
        <JsonPanel value={client.config} />
      </Box>
      <Box sx={{ padding: 1 }}>
        <JsonPanel value={client.info()} />
      </Box>
      <Box sx={{ padding: 1 }}>
        <JsonPanel value={data} />
      </Box>
    </Box>
  );
};
