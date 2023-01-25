//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';
import { HashRouter } from 'react-router-dom';

import { appkitTranslations, Fallback } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';

import { AppState, AppStateProvider, BotsProvider, FramesProvider, useAppRoutes, useClientProvider } from '../hooks';
import kaiTranslations from '../translations';
import { frames } from './Frames';
import { PWA } from './PWA';

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
    <ThemeProvider
      appNs='kai'
      resourceExtensions={[appkitTranslations, kaiTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <ClientProvider client={() => clientProvider(initialState.dev ?? false)}>
        <AppStateProvider value={initialState}>
          <BotsProvider>
            <FramesProvider frames={frames}>
              <HashRouter>
                <Routes />
                {initialState.pwa && <PWA />}
              </HashRouter>
            </FramesProvider>
          </BotsProvider>
        </AppStateProvider>
      </ClientProvider>
    </ThemeProvider>
  );
};
