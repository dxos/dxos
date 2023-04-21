//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import { FrameRegistryContextProvider, frameDefs, frameModules } from '@dxos/kai-frames';
import { typeModules } from '@dxos/kai-types';
import { MetagraphClientFake } from '@dxos/metagraph';
import { appkitTranslations, ErrorProvider, ResetDialog, ThemeProvider } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { MetagraphProvider } from '@dxos/react-metagraph';
import { osTranslations } from '@dxos/react-ui';

import { AppState, AppStateProvider, configProvider, useClientProvider, botModules, defaultFrames } from '../../hooks';
import kaiTranslations from '../../translations';
import { ShellProvider } from '../ShellProvider';

/**
 * Main app container.
 */
export const Root: FC<PropsWithChildren<{ initialState?: Partial<AppState> }>> = ({ initialState = {}, children }) => {
  const clientProvider = useClientProvider(initialState.dev ?? false);
  const metagraphContext = {
    client: new MetagraphClientFake([...botModules, ...frameModules, ...typeModules])
  };

  return (
    <ThemeProvider
      appNs='kai'
      rootDensity='fine'
      resourceExtensions={[appkitTranslations, kaiTranslations, osTranslations]}
    >
      <ErrorProvider>
        <ErrorBoundary fallback={({ error }) => <ResetDialog error={error} config={configProvider} />}>
          <ClientProvider client={clientProvider}>
            <MetagraphProvider value={metagraphContext}>
              <FrameRegistryContextProvider frameDefs={frameDefs}>
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
