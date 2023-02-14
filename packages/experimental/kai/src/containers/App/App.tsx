//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { HashRouter } from 'react-router-dom';

import { MetagraphClientFake } from '@dxos/metagraph';
import { appkitTranslations, ErrorProvider, FatalError } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { MetagraphProvider } from '@dxos/react-metagraph';

import {
  AppState,
  AppStateProvider,
  useAppRoutes,
  useClientProvider,
  botModules,
  defaultFrames,
  frameModules
} from '../../hooks';
import kaiTranslations from '../../translations';

/**
 * Routes component must be inside of Router container.
 */
const AppRoutes = () => {
  return useAppRoutes();
};

/**
 * Main app container with routes.
 */
export const App: FC<PropsWithChildren<{ initialState?: AppState }>> = ({ initialState = {}, children }) => {
  const clientProvider = useClientProvider();
  const metagraphContext = {
    client: new MetagraphClientFake([...botModules, ...frameModules])
  };

  return (
    <ThemeProvider appNs='kai' resourceExtensions={[appkitTranslations, kaiTranslations]}>
      <ErrorProvider>
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider client={() => clientProvider(initialState.dev ?? false)}>
            <MetagraphProvider value={metagraphContext}>
              <AppStateProvider initialState={{ ...initialState, frames: defaultFrames }}>
                <HashRouter>
                  <AppRoutes />
                  {children}
                </HashRouter>
              </AppStateProvider>
            </MetagraphProvider>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
