//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { HashRouter } from 'react-router-dom';

import { ClientProvider } from '@dxos/react-client';

import { AppState, AppStateProvider, BotsProvider, FramesProvider, useAppRoutes, useClientProvider } from '../hooks';
import { frames } from './Frames';

const Routes = () => {
  return useAppRoutes();
};

/**
 * Main app container with routes.
 */
export const App: FC<{ initialState: AppState }> = ({ initialState = {} }) => {
  const clientProvider = useClientProvider();

  // TODO(burdon): Error boundary and indicator.
  return (
    <ClientProvider client={() => clientProvider(initialState.demo ?? false)}>
      <AppStateProvider value={initialState}>
        <BotsProvider>
          <FramesProvider frames={frames}>
            <HashRouter>
              <Routes />
            </HashRouter>
          </FramesProvider>
        </BotsProvider>
      </AppStateProvider>
    </ClientProvider>
  );
};
