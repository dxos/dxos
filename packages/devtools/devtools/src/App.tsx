//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { CssBaseline, ThemeProvider } from '@mui/material';

import { Client } from '@dxos/client';
import { ClientProvider } from '@dxos/react-client';
import { ErrorBoundary } from '@dxos/react-toolkit';

import { PanelsContainer } from './containers';
import { sections } from './sections';
import { theme } from './theme';

export const App = ({ client }: { client: Client }) => (
  <ErrorBoundary>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ClientProvider client={client}>
        <PanelsContainer sections={sections} />
      </ClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
