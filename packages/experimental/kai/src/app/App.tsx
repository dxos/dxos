//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { HashRouter } from 'react-router-dom';

import { appkitTranslations, ErrorProvider, Fallback, FatalError } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';

import { AppState, AppStateProvider, BotsProvider, FramesProvider, useAppRoutes, useClientProvider } from '../hooks';
import kaiTranslations from '../translations';
import { frames } from './FrameDefs';

const Routes = () => {
  return useAppRoutes();
};

/**
 * Main app container with routes.
 */
export const App: FC<PropsWithChildren<{ initialState?: AppState }>> = ({ initialState = {}, children }) => {
  const clientProvider = useClientProvider();

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
            <AppStateProvider value={initialState}>
              <BotsProvider>
                <FramesProvider frames={frames}>
                  <HashRouter>
                    <Routes />
                    {children}
                  </HashRouter>
                </FramesProvider>
              </BotsProvider>
            </AppStateProvider>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
