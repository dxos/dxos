//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React, { FC, PropsWithChildren } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';

import { appkitTranslations, ErrorProvider, Fallback, FatalError } from '@dxos/react-appkit';
import { ClientProvider } from '@dxos/react-client';
import { ThemeProvider } from '@dxos/react-components';
import { osTranslations } from '@dxos/react-ui';

import { AppState, AppStateProvider, BotsProvider, defaultFrameId, FramesProvider, useClientProvider } from '../hooks';
import kaiTranslations from '../translations';
import { frames } from './Frames';
import { ShellProvider } from './ShellProvider';
import { createSpacePath } from './router';

/**
 * Main app container.
 */
export const Root: FC<PropsWithChildren<{ initialState?: AppState }>> = ({ initialState = {}, children }) => {
  const clientProvider = useClientProvider(initialState.dev ?? false);
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
            <AppStateProvider value={initialState}>
              <BotsProvider>
                <FramesProvider frames={frames}>
                  <ShellProvider>
                    <Outlet />
                    {children}
                  </ShellProvider>
                </FramesProvider>
              </BotsProvider>
            </AppStateProvider>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorProvider>
    </ThemeProvider>
  );
};
