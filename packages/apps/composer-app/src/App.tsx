//
// Copyright 2022 DXOS.org
//

import { ErrorBoundary } from '@sentry/react';
import React from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';

import { Client, fromIFrame, Space } from '@dxos/client';
import { Config, Defaults, Dynamics } from '@dxos/config';
import {
  AppLayout,
  ErrorsProvider,
  Fallback,
  FatalError,
  GenericFallback,
  RequireIdentity,
  ServiceWorkerToast,
  SpacesView
} from '@dxos/react-appkit';
import { ClientProvider, useConfig } from '@dxos/react-client';
import { DOCUMENT_TYPE } from '@dxos/react-composer';
import { UiKitProvider } from '@dxos/react-uikit';
import { captureException } from '@dxos/sentry';
import { TextModel } from '@dxos/text-model';

import { SpacePage } from './pages';

const configProvider = async () => new Config(await Dynamics(), Defaults());

const clientProvider = async () => {
  const config = await configProvider();
  const client = new Client({ config, services: fromIFrame(config) });
  await client.initialize();
  return client;
};

const Routes = () => {
  // TODO(wittjosiah): useTelemetry.

  const config = useConfig();
  // TODO(wittjosiah): Separate config for HALO UI & vault so origin doesn't need to parsed out.
  // TODO(wittjosiah): Config defaults should be available from the config.
  const remoteSource = new URL(config.get('runtime.client.remoteSource') || 'https://halo.dxos.org');

  const handleSpaceCreate = async (space: Space) => {
    await space.database.createItem({
      model: TextModel,
      type: DOCUMENT_TYPE
    });
  };

  return useRoutes([
    {
      path: '/',
      element: <RequireIdentity redirect={remoteSource.origin} />,
      children: [
        {
          path: '/',
          element: <AppLayout onSpaceCreate={handleSpaceCreate} />,
          children: [
            {
              path: '/',
              element: <SpacesView />
            },
            {
              path: '/spaces/:space',
              element: <SpacePage />
            }
          ]
        }
      ]
    }
  ]);
};

export const App = () => {
  const {
    offlineReady: [offlineReady, _setOfflineReady],
    needRefresh: [needRefresh, _setNeedRefresh],
    updateServiceWorker
  } = useRegisterSW({
    onRegisterError: (err) => {
      captureException(err);
      console.error(err);
    }
  });

  return (
    <UiKitProvider fallback={<Fallback message='Loading...' />}>
      <ErrorsProvider>
        {/* TODO(wittjosiah): Hook up user feedback mechanism. */}
        <ErrorBoundary fallback={({ error }) => <FatalError error={error} />}>
          <ClientProvider client={clientProvider} fallback={<GenericFallback />}>
            <HashRouter>
              <Routes />
              {needRefresh ? (
                <ServiceWorkerToast {...{ variant: 'needRefresh', updateServiceWorker }} />
              ) : offlineReady ? (
                <ServiceWorkerToast variant='offlineReady' />
              ) : null}
            </HashRouter>
          </ClientProvider>
        </ErrorBoundary>
      </ErrorsProvider>
    </UiKitProvider>
  );
};
