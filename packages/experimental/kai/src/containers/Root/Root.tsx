//
// Copyright 2023 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { MetagraphClientFake } from '@dxos/metagraph';
import { appkitTranslations, ErrorProvider, FatalError } from '@dxos/react-appkit';
import { ClientProvider, PublicKey, SpaceProvider } from '@dxos/react-client';
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
  defaultFrames,
  createPath,
  findSpace
} from '../../hooks';
import kaiTranslations from '../../translations';
import { ShellProvider } from '../ShellProvider';

/**
 * Main app container.
 */
export const Root: FC<PropsWithChildren<{ initialState?: AppState }>> = ({ initialState = {}, children }) => {
  const navigate = useNavigate();
  const { spaceKey, frame } = useParams();
  const clientProvider = useClientProvider(initialState.dev ?? false);
  const metagraphContext = {
    client: new MetagraphClientFake([...botModules, ...frameModules])
  };

  return (
    <ThemeProvider appNs='kai' resourceExtensions={[appkitTranslations, kaiTranslations, osTranslations]}>
      <ErrorProvider>
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider client={clientProvider}>
            <SpaceProvider
              initialSpaceKey={(spaces) => (spaceKey ? findSpace(spaces, spaceKey)?.key : undefined) ?? spaces[0]?.key}
              onSpaceChange={(spaceKey: PublicKey) =>
                navigate(createPath({ spaceKey, frame: frame ?? defaultFrameId }))
              }
            >
              <MetagraphProvider value={metagraphContext}>
                <AppStateProvider initialState={{ ...initialState, frames: defaultFrames }}>
                  <ShellProvider>
                    <Outlet />
                    {children}
                  </ShellProvider>
                </AppStateProvider>
              </MetagraphProvider>
            </SpaceProvider>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
