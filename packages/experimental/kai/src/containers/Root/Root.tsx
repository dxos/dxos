//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { MetagraphClientFake } from '@dxos/metagraph';
import { appkitTranslations, ErrorProvider, Fallback, FatalError } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { MetagraphProvider } from '@dxos/react-metagraph';
import { osTranslations } from '@dxos/react-ui';

import {
  AppState,
  AppStateProvider,
  defaultFrameId,
  useClientProvider,
  botModules,
  frameModules,
  defaultFrames
} from '../../hooks';
import { createSpacePath } from '../../router';
import kaiTranslations from '../../translations';
import { ShellProvider } from '../ShellProvider';

/**
 * Main app container.
 */
export const Root: FC<PropsWithChildren<{ initialState?: AppState }>> = ({ initialState = {}, children }) => {
  const clientProvider = useClientProvider(initialState.dev ?? false);
  const metagraphContext = {
    client: new MetagraphClientFake([...botModules, ...frameModules])
  };
  const navigate = useNavigate();
  const { spaceKey, frame } = useParams();

  return (
    <ThemeProvider
      appNs='kai'
      resourceExtensions={[appkitTranslations, kaiTranslations, osTranslations]}
      fallback={<Fallback message='Loading...' />}
    >
      <ErrorProvider>
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider
            client={clientProvider}
            spaceProvider={{
              initialSpaceKey: (spaces) =>
                spaces.find((space) => space.key.truncate() === spaceKey)?.key ?? spaces[0]?.key,
              onSpaceChange: (spaceKey) => navigate(createSpacePath(spaceKey, frame ?? defaultFrameId))
            }}
          >
            <MetagraphProvider value={metagraphContext}>
              <AppStateProvider initialState={{ ...initialState, frames: defaultFrames }}>
                <ShellProvider>
                  <Outlet />
                  {children}
                </ShellProvider>
              </AppStateProvider>
            </MetagraphProvider>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
