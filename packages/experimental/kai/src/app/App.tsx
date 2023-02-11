//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { HashRouter } from 'react-router-dom';

import { appkitTranslations, ErrorProvider, Fallback, FatalError } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { MetagraphContext } from '@dxos/react-metagraph';

import {
  AppState,
  AppStateProvider,
  useAppRoutes,
  useClientProvider,
  botModules,
  defaultFrames,
  frameModules
} from '../hooks';
import kaiTranslations from '../translations';

const Routes = () => {
  return useAppRoutes();
};

/**
 * Main app container with routes.
 */
export const App: FC<PropsWithChildren<{ initialState?: AppState }>> = ({ initialState = {}, children }) => {
  const clientProvider = useClientProvider();

  const metagraphContext = {
    frames: frameModules,
    bots: botModules
  };

  // TODO(burdon): Error boundary and indicator.
  return (
    <ThemeProvider
      appNs='kai'
      resourceExtensions={[appkitTranslations, kaiTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <ErrorProvider>
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider client={() => clientProvider(initialState.dev ?? false)}>
            <MetagraphContext.Provider value={metagraphContext}>
              <AppStateProvider initialState={{ ...initialState, frames: defaultFrames }}>
                <HashRouter>
                  <Routes />
                  {children}
                </HashRouter>
              </AppStateProvider>
            </MetagraphContext.Provider>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
