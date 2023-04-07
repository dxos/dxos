//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import { FrameRegistryContextProvider } from '@dxos/kai-frames';
import { MetagraphClientFake } from '@dxos/metagraph';
import { appkitTranslations, ErrorProvider, FatalError } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { MetagraphProvider } from '@dxos/react-metagraph';
import { osTranslations } from '@dxos/react-ui';

import { frameModules } from '../../frames';
import { AppState, AppStateProvider, useClientProvider, botModules, defaultFrames } from '../../hooks';
import kaiTranslations from '../../translations';
import { ShellProvider } from '../ShellProvider';

/**
 * Main app container.
 */
export const Root: FC<PropsWithChildren<{ initialState?: Partial<AppState> }>> = ({ initialState = {}, children }) => {
  const clientProvider = useClientProvider(initialState.dev ?? false);
  const metagraphContext = {
    client: new MetagraphClientFake([...botModules, ...frameModules])
  };

  return (
    <ThemeProvider
      appNs='kai'
      rootDensity='fine'
      resourceExtensions={[appkitTranslations, kaiTranslations, osTranslations]}
    >
      <ErrorProvider>
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider client={clientProvider}>
            <MetagraphProvider value={metagraphContext}>
              <FrameRegistryContextProvider>
                <AppStateProvider initialState={{ ...initialState, frames: defaultFrames }}>
                  <ShellProvider>
                    <Outlet />
                    {children}
                  </ShellProvider>
                </AppStateProvider>
              </FrameRegistryContextProvider>
            </MetagraphProvider>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
