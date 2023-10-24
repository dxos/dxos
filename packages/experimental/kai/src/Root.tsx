//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { Outlet } from 'react-router-dom';

import { Main } from '@dxos/react-ui';
import { FrameRegistryContextProvider, frameDefs, frameModules } from '@dxos/kai-frames';
import {
  AppState,
  AppStateProvider,
  ShellProvider,
  botModules,
  configProvider,
  defaultFrames,
  kaiTranslations,
  useClientProvider,
} from '@dxos/kai-framework';
import { typeModules } from '@dxos/kai-types';
import { MetagraphClientFake } from '@dxos/metagraph';
import { appkitTranslations, ErrorProvider, ResetDialog, ThemeProvider } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { MetagraphProvider } from '@dxos/react-metagraph';
import { osTranslations } from '@dxos/react-shell';

/**
 * Main app container.
 */
export const Root: FC<PropsWithChildren<{ initialState?: Partial<AppState> }>> = ({ initialState = {}, children }) => {
  const clientProvider = useClientProvider(initialState.dev ?? false);
  const metagraphContext = {
    client: new MetagraphClientFake([...botModules, ...frameModules, ...typeModules]),
  };

  // TODO(burdon): Factor out config.

  return (
    <ThemeProvider
      appNs='kai'
      rootDensity='fine'
      resourceExtensions={[appkitTranslations, kaiTranslations, osTranslations]}
    >
      <ErrorProvider config={configProvider}>
        <ErrorBoundary fallback={({ error }) => <ResetDialog error={error} config={configProvider} />}>
          <ClientProvider client={clientProvider}>
            <MetagraphProvider value={metagraphContext}>
              <FrameRegistryContextProvider frameDefs={frameDefs}>
                <AppStateProvider initialState={{ ...initialState, frames: defaultFrames }}>
                  <ShellProvider>
                    <Main.Root>
                      <Main.Overlay />
                      <Outlet />
                    </Main.Root>
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
